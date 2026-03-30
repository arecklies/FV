import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  DokumentDbSchema,
  DokumentVersionDbSchema,
  type Dokument,
  type DokumentVersion,
  type CreateDokumentInput,
  type UpdateDokumentInput,
  type CreateVersionInput,
} from "./types";
import { istErlaubterMimeType, istKonsistenterMimeType, endungFuerMimeType } from "./validation";

/**
 * DokumentenService (ADR-003, ADR-009, PROJ-5)
 *
 * Fachlogik fuer Dokumentenverwaltung mit Versionierung.
 * Erhaelt Supabase-Client als Parameter (DI). Kennt kein HTTP.
 *
 * Storage-Pfad: dokumente/{tenant_id}/{vorgang_id}/{dokument_id}/v{version}/original.{ext}
 */

const STORAGE_BUCKET = "dokumente";
const SIGNED_URL_EXPIRES_IN = 3600; // 60 Minuten
const MAX_DOKUMENTE_PRO_VORGANG = 500;

// -- Hilfsfunktion: Storage-Pfad berechnen --

export function berechneStoragePfad(
  tenantId: string,
  vorgangId: string,
  dokumentId: string,
  version: number,
  mimeType: string
): string {
  const ext = endungFuerMimeType(mimeType) ?? "bin";
  return `${tenantId}/${vorgangId}/${dokumentId}/v${version}/original.${ext}`;
}

// -- erstelleDokument --

export interface ErstelleDokumentResult {
  dokument: Dokument;
  uploadUrl: string;
}

/**
 * Erstellt ein neues Dokument (Status: uploading) und generiert eine signierte Upload-URL.
 * Der Client laedt die Datei direkt in Supabase Storage hoch (ADR-009 Schritt 1-3).
 */
export async function erstelleDokument(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string,
  data: CreateDokumentInput
): Promise<{ data: ErstelleDokumentResult | null; error: string | null }> {
  // 1. MIME-Type validieren
  if (!istErlaubterMimeType(data.mime_type)) {
    return { data: null, error: "Nicht unterstützter Dateityp" };
  }

  // 2. Konsistenz Dateiname <-> MIME-Type pruefen
  if (!istKonsistenterMimeType(data.dateiname, data.mime_type)) {
    return { data: null, error: "Dateiendung passt nicht zum angegebenen Dateityp" };
  }

  // 3. Dokument in DB anlegen (Status: uploading)
  const { data: dokument, error: insertError } = await client
    .from("vorgang_dokumente")
    .insert({
      tenant_id: tenantId,
      vorgang_id: vorgangId,
      dateiname: data.dateiname,
      kategorie: data.kategorie ?? "sonstiges",
      beschreibung: data.beschreibung ?? null,
      schlagwoerter: data.schlagwoerter ?? [],
      status: "uploading",
      uploaded_by: userId,
    })
    .select()
    .single();

  if (insertError || !dokument) {
    console.error("[PROJ-5] erstelleDokument: DB insert failed", insertError);
    return { data: null, error: "Dokument konnte nicht erstellt werden" };
  }

  const parsedDokument = DokumentDbSchema.parse(dokument);

  // 4. Storage-Pfad berechnen und signierte Upload-URL generieren
  const storagePfad = berechneStoragePfad(tenantId, vorgangId, parsedDokument.id, 1, data.mime_type);

  const storageClient = createServiceRoleClient();
  const { data: signedUrlData, error: signedUrlError } = await storageClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePfad);

  if (signedUrlError || !signedUrlData) {
    console.error("[PROJ-5] erstelleDokument: signierte Upload-URL Fehler", signedUrlError);
    // Dokument auf failed setzen
    await client
      .from("vorgang_dokumente")
      .update({ status: "failed" })
      .eq("id", parsedDokument.id)
      .eq("tenant_id", tenantId);
    return { data: null, error: "Upload-URL konnte nicht generiert werden" };
  }

  // 5. Audit-Log
  await writeAuditLog({
    tenantId,
    userId,
    action: "dokument.erstellt",
    resourceType: "vorgang_dokumente",
    resourceId: parsedDokument.id,
    payload: { vorgang_id: vorgangId, dateiname: data.dateiname, kategorie: data.kategorie },
  });

  return {
    data: {
      dokument: parsedDokument,
      uploadUrl: signedUrlData.signedUrl,
    },
    error: null,
  };
}

// -- bestaetigeUpload --

/**
 * Bestaetigt einen Upload: Setzt Status auf 'active' und erstellt Version 1.
 * Wird vom Client nach erfolgreichem Direct Upload aufgerufen (ADR-009 Schritt 5-6).
 */
export async function bestaetigeUpload(
  client: SupabaseClient,
  tenantId: string,
  dokumentId: string
): Promise<{ data: Dokument | null; error: string | null }> {
  // 1. Dokument laden und Status pruefen
  const { data: dokument, error: loadError } = await client
    .from("vorgang_dokumente")
    .select()
    .eq("id", dokumentId)
    .eq("tenant_id", tenantId)
    .eq("status", "uploading")
    .single();

  if (loadError || !dokument) {
    return { data: null, error: "Dokument nicht gefunden oder bereits bestätigt" };
  }

  const parsedDok = DokumentDbSchema.parse(dokument);

  // 2. Storage-Pfad berechnen (aus Dateiname MIME-Type ableiten)
  // Wir brauchen den MIME-Type -- aus der Dateiendung ableiten
  const storagePfad = berechneStoragePfad(
    tenantId,
    parsedDok.vorgang_id,
    dokumentId,
    1,
    ermittleMimeTypeAusDateiname(parsedDok.dateiname)
  );

  // 3. Version 1 erstellen
  const { error: versionError } = await client
    .from("vorgang_dokument_versionen")
    .insert({
      tenant_id: tenantId,
      dokument_id: dokumentId,
      version: 1,
      dateiname: parsedDok.dateiname,
      mime_type: ermittleMimeTypeAusDateiname(parsedDok.dateiname),
      dateigroesse: 0, // Wird spaeter via Storage-Metadaten aktualisiert
      storage_pfad: storagePfad,
      uploaded_by: parsedDok.uploaded_by,
    })
    .select()
    .single();

  if (versionError) {
    console.error("[PROJ-5] bestaetigeUpload: Version-Insert fehlgeschlagen", versionError);
    return { data: null, error: "Version konnte nicht erstellt werden" };
  }

  // 4. Dokument-Status auf 'active' setzen
  const { data: updated, error: updateError } = await client
    .from("vorgang_dokumente")
    .update({ status: "active", aktuelle_version: 1 })
    .eq("id", dokumentId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("[PROJ-5] bestaetigeUpload: Status-Update fehlgeschlagen", updateError);
    return { data: null, error: "Status konnte nicht aktualisiert werden" };
  }

  return { data: DokumentDbSchema.parse(updated), error: null };
}

// -- Hilfsfunktion: MIME-Type aus Dateiname ableiten --

import { ERLAUBTE_MIME_TYPES } from "./types";
import { extrahiereDateiendung } from "./validation";

function ermittleMimeTypeAusDateiname(dateiname: string): string {
  const endung = extrahiereDateiendung(dateiname);
  if (!endung) return "application/octet-stream";
  return ERLAUBTE_MIME_TYPES.get(endung) ?? "application/octet-stream";
}

// -- holeDokumente --

/**
 * Alle aktiven Dokumente eines Vorgangs laden (mit .limit()).
 */
export async function holeDokumente(
  client: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: Dokument[]; error: string | null }> {
  const { data, error } = await client
    .from("vorgang_dokumente")
    .select()
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .eq("status", "active")
    .order("uploaded_at", { ascending: false })
    .limit(MAX_DOKUMENTE_PRO_VORGANG);

  if (error) {
    console.error("[PROJ-5] holeDokumente: Query fehlgeschlagen", error);
    return { data: [], error: "Dokumente konnten nicht geladen werden" };
  }

  const parsed = (data ?? []).map((d: unknown) => DokumentDbSchema.parse(d));
  return { data: parsed, error: null };
}

// -- holeDokumentMitVersionen --

export interface DokumentMitVersionen {
  dokument: Dokument;
  versionen: DokumentVersion[];
}

/**
 * Einzelnes Dokument mit allen Versionen laden.
 */
export async function holeDokumentMitVersionen(
  client: SupabaseClient,
  tenantId: string,
  dokumentId: string
): Promise<{ data: DokumentMitVersionen | null; error: string | null }> {
  // 1. Dokument laden
  const { data: dokument, error: dokError } = await client
    .from("vorgang_dokumente")
    .select()
    .eq("id", dokumentId)
    .eq("tenant_id", tenantId)
    .single();

  if (dokError || !dokument) {
    return { data: null, error: "Dokument nicht gefunden" };
  }

  // 2. Versionen laden
  const { data: versionen, error: verError } = await client
    .from("vorgang_dokument_versionen")
    .select()
    .eq("dokument_id", dokumentId)
    .eq("tenant_id", tenantId)
    .order("version", { ascending: false })
    .limit(100);

  if (verError) {
    console.error("[PROJ-5] holeDokumentMitVersionen: Versionen-Query fehlgeschlagen", verError);
    return { data: null, error: "Versionen konnten nicht geladen werden" };
  }

  return {
    data: {
      dokument: DokumentDbSchema.parse(dokument),
      versionen: (versionen ?? []).map((v: unknown) => DokumentVersionDbSchema.parse(v)),
    },
    error: null,
  };
}

// -- aktualisiereMetadaten --

/**
 * Metadaten eines Dokuments aktualisieren (Kategorie, Beschreibung, Schlagwoerter).
 */
export async function aktualisiereMetadaten(
  client: SupabaseClient,
  tenantId: string,
  dokumentId: string,
  data: UpdateDokumentInput
): Promise<{ data: Dokument | null; error: string | null }> {
  const updatePayload: Record<string, unknown> = {};
  if (data.kategorie !== undefined) updatePayload.kategorie = data.kategorie;
  if (data.beschreibung !== undefined) updatePayload.beschreibung = data.beschreibung;
  if (data.schlagwoerter !== undefined) updatePayload.schlagwoerter = data.schlagwoerter;

  if (Object.keys(updatePayload).length === 0) {
    return { data: null, error: "Keine Änderungen angegeben" };
  }

  const { data: updated, error } = await client
    .from("vorgang_dokumente")
    .update(updatePayload)
    .eq("id", dokumentId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error || !updated) {
    console.error("[PROJ-5] aktualisiereMetadaten: Update fehlgeschlagen", error);
    return { data: null, error: "Metadaten konnten nicht aktualisiert werden" };
  }

  return { data: DokumentDbSchema.parse(updated), error: null };
}

// -- erzeugeDownloadUrl --

/**
 * Erzeugt eine signierte Download-URL (60 Min Gueltigkeitsdauer).
 * Laedt optional eine bestimmte Version (Standard: aktuelle Version).
 */
export async function erzeugeDownloadUrl(
  client: SupabaseClient,
  tenantId: string,
  dokumentId: string,
  version?: number
): Promise<{ data: { url: string; dateiname: string } | null; error: string | null }> {
  // 1. Version ermitteln
  let versionQuery = client
    .from("vorgang_dokument_versionen")
    .select()
    .eq("dokument_id", dokumentId)
    .eq("tenant_id", tenantId);

  if (version !== undefined) {
    versionQuery = versionQuery.eq("version", version);
  } else {
    versionQuery = versionQuery.order("version", { ascending: false });
  }

  const { data: versionData, error: versionError } = await versionQuery
    .limit(1)
    .single();

  if (versionError || !versionData) {
    return { data: null, error: "Version nicht gefunden" };
  }

  const parsedVersion = DokumentVersionDbSchema.parse(versionData);

  // 2. Signierte Download-URL generieren (via Service-Role fuer Storage-Zugriff)
  const storageClient = createServiceRoleClient();
  const { data: signedData, error: signedError } = await storageClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(parsedVersion.storage_pfad, SIGNED_URL_EXPIRES_IN, {
      download: parsedVersion.dateiname,
    });

  if (signedError || !signedData) {
    console.error("[PROJ-5] erzeugeDownloadUrl: Signierte URL Fehler", signedError);
    return { data: null, error: "Download-URL konnte nicht generiert werden" };
  }

  return {
    data: {
      url: signedData.signedUrl,
      dateiname: parsedVersion.dateiname,
    },
    error: null,
  };
}

// -- erstelleVersion --

export interface ErstelleVersionResult {
  version: DokumentVersion;
  uploadUrl: string;
}

/**
 * Erstellt eine neue Version eines bestehenden Dokuments.
 * Inkrementiert aktuelle_version und generiert signierte Upload-URL.
 */
export async function erstelleVersion(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  dokumentId: string,
  data: CreateVersionInput
): Promise<{ data: ErstelleVersionResult | null; error: string | null }> {
  // 1. MIME-Type validieren
  if (!istErlaubterMimeType(data.mime_type)) {
    return { data: null, error: "Nicht unterstützter Dateityp" };
  }

  // 2. Dokument laden
  const { data: dokument, error: dokError } = await client
    .from("vorgang_dokumente")
    .select()
    .eq("id", dokumentId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (dokError || !dokument) {
    return { data: null, error: "Dokument nicht gefunden oder nicht aktiv" };
  }

  const parsedDok = DokumentDbSchema.parse(dokument);
  const neueVersion = parsedDok.aktuelle_version + 1;

  // 3. Storage-Pfad berechnen
  const storagePfad = berechneStoragePfad(
    tenantId,
    parsedDok.vorgang_id,
    dokumentId,
    neueVersion,
    data.mime_type
  );

  // 4. Version in DB anlegen
  const { data: versionRow, error: insertError } = await client
    .from("vorgang_dokument_versionen")
    .insert({
      tenant_id: tenantId,
      dokument_id: dokumentId,
      version: neueVersion,
      dateiname: data.dateiname,
      mime_type: data.mime_type,
      dateigroesse: data.dateigroesse,
      storage_pfad: storagePfad,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (insertError || !versionRow) {
    console.error("[PROJ-5] erstelleVersion: Version-Insert fehlgeschlagen", insertError);
    return { data: null, error: "Version konnte nicht erstellt werden" };
  }

  // 5. aktuelle_version auf Dokument aktualisieren
  await client
    .from("vorgang_dokumente")
    .update({ aktuelle_version: neueVersion })
    .eq("id", dokumentId)
    .eq("tenant_id", tenantId);

  // 6. Signierte Upload-URL generieren
  const storageClient = createServiceRoleClient();
  const { data: signedUrlData, error: signedUrlError } = await storageClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePfad);

  if (signedUrlError || !signedUrlData) {
    console.error("[PROJ-5] erstelleVersion: Upload-URL Fehler", signedUrlError);
    return { data: null, error: "Upload-URL konnte nicht generiert werden" };
  }

  // 7. Audit-Log
  await writeAuditLog({
    tenantId,
    userId,
    action: "dokument.version_erstellt",
    resourceType: "vorgang_dokument_versionen",
    resourceId: versionRow.id,
    payload: { dokument_id: dokumentId, version: neueVersion, dateiname: data.dateiname },
  });

  return {
    data: {
      version: DokumentVersionDbSchema.parse(versionRow),
      uploadUrl: signedUrlData.signedUrl,
    },
    error: null,
  };
}
