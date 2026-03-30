import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { getVorgang, getVerfahrensart } from "@/lib/services/verfahren";
import {
  BescheidDbSchema,
  BausteinSnapshotSchema,
  NebenbestimmungSchema,
  type Bescheid,
  type BausteinSnapshot,
  type Nebenbestimmung,
  type Bescheidtyp,
} from "./types";
import { resolvePlaceholders, resolveVorgangPlatzhalter } from "./placeholder";

/**
 * BescheidService (PROJ-6, ADR-003, ADR-010)
 *
 * Fachlogik fuer Bescheiderzeugung. Erhaelt Supabase-Client als Parameter (DI).
 * Kennt kein HTTP — wird von API-Routes aufgerufen.
 */

// -- Bescheid CRUD --

/**
 * Erstellt einen neuen Bescheid-Entwurf fuer einen Vorgang.
 * Laedt automatisch Platzhalter-Werte aus Vorgangsdaten.
 */
export async function createBescheidEntwurf(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string,
  bescheidtyp: Bescheidtyp
): Promise<{ data: Bescheid | null; error: string | null }> {
  // Vorgang laden fuer initiale Platzhalter-Werte
  const vorgangResult = await getVorgang(serviceClient, tenantId, vorgangId);
  if (vorgangResult.error || !vorgangResult.data) {
    return { data: null, error: "Vorgang nicht gefunden" };
  }

  const vorgang = vorgangResult.data;

  // Verfahrensart-Bezeichnung laden
  const verfahrensart = await getVerfahrensart(serviceClient, vorgang.verfahrensart_id);
  const verfahrensartBezeichnung = verfahrensart?.bezeichnung;

  // Platzhalter aus Vorgangsdaten befuellen
  const platzhalterWerte = resolveVorgangPlatzhalter(vorgang, verfahrensartBezeichnung);

  const { data, error } = await serviceClient
    .from("vorgang_bescheide")
    .insert({
      tenant_id: tenantId,
      vorgang_id: vorgangId,
      bescheidtyp,
      status: "entwurf",
      bausteine: [],
      nebenbestimmungen: [],
      platzhalter_werte: platzhalterWerte,
      erstellt_von: userId,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };

  const bescheid = BescheidDbSchema.parse(data);

  await writeAuditLog({
    tenantId,
    userId,
    action: "bescheid.erstellt",
    resourceType: "vorgang_bescheide",
    resourceId: bescheid.id,
    payload: { vorgang_id: vorgangId, bescheidtyp },
  });

  return { data: bescheid, error: null };
}

/**
 * Laedt den aktuellen Bescheid-Entwurf eines Vorgangs.
 * Gibt den neuesten Entwurf zurueck (ein aktiver Entwurf pro Vorgang).
 */
export async function getBescheidEntwurf(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: Bescheid | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_bescheide")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") {
    // Kein Bescheid vorhanden
    return { data: null, error: null };
  }
  if (error) return { data: null, error: error.message };

  return { data: BescheidDbSchema.parse(data), error: null };
}

/**
 * Aktualisiert die Baustein-Liste eines Bescheids mit Optimistic Locking.
 */
export async function updateBausteine(
  serviceClient: SupabaseClient,
  tenantId: string,
  bescheidId: string,
  bausteine: BausteinSnapshot[],
  version: number
): Promise<{ data: Bescheid | null; error: string | null }> {
  // Bausteine validieren
  const validiert = bausteine.map((b) => BausteinSnapshotSchema.parse(b));

  const { data, error } = await serviceClient
    .from("vorgang_bescheide")
    .update({
      bausteine: validiert,
      version: version + 1,
    })
    .eq("id", bescheidId)
    .eq("tenant_id", tenantId)
    .eq("version", version)
    .select("*")
    .single();

  if (error && error.code === "PGRST116") {
    return { data: null, error: "CONFLICT" };
  }
  if (error) return { data: null, error: error.message };

  return { data: BescheidDbSchema.parse(data), error: null };
}

/**
 * Aktualisiert die Nebenbestimmungen eines Bescheids mit Optimistic Locking.
 */
export async function updateNebenbestimmungen(
  serviceClient: SupabaseClient,
  tenantId: string,
  bescheidId: string,
  nebenbestimmungen: Nebenbestimmung[],
  version: number
): Promise<{ data: Bescheid | null; error: string | null }> {
  // Nebenbestimmungen validieren
  const validiert = nebenbestimmungen.map((n) => NebenbestimmungSchema.parse(n));

  const { data, error } = await serviceClient
    .from("vorgang_bescheide")
    .update({
      nebenbestimmungen: validiert,
      version: version + 1,
    })
    .eq("id", bescheidId)
    .eq("tenant_id", tenantId)
    .eq("version", version)
    .select("*")
    .single();

  if (error && error.code === "PGRST116") {
    return { data: null, error: "CONFLICT" };
  }
  if (error) return { data: null, error: error.message };

  return { data: BescheidDbSchema.parse(data), error: null };
}

/**
 * Berechnet Platzhalter-Werte fuer einen Vorgang.
 * Gibt eine Map von Feldname → aufgeloester Wert zurueck.
 */
export async function berechnePlatzhalterWerte(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: Record<string, string> | null; error: string | null }> {
  const vorgangResult = await getVorgang(serviceClient, tenantId, vorgangId);
  if (vorgangResult.error || !vorgangResult.data) {
    return { data: null, error: "Vorgang nicht gefunden" };
  }

  const vorgang = vorgangResult.data;
  const verfahrensart = await getVerfahrensart(serviceClient, vorgang.verfahrensart_id);

  const werte = resolveVorgangPlatzhalter(vorgang, verfahrensart?.bezeichnung);
  return { data: werte, error: null };
}

/**
 * Rendert eine HTML-Vorschau des Bescheids.
 * Setzt alle Bausteine zusammen und ersetzt Platzhalter.
 * NICHT fuer PDF-Erzeugung (das kommt als separater Schritt via Puppeteer).
 */
export async function renderVorschau(
  serviceClient: SupabaseClient,
  tenantId: string,
  bescheidId: string
): Promise<{ html: string; missing: string[]; error: string | null }> {
  // Bescheid laden
  const { data: bescheid, error } = await serviceClient
    .from("vorgang_bescheide")
    .select("*")
    .eq("id", bescheidId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !bescheid) {
    return { html: "", missing: [], error: "Bescheid nicht gefunden" };
  }

  const parsed = BescheidDbSchema.parse(bescheid);
  const werte = parsed.platzhalter_werte;

  // Alle fehlenden Platzhalter sammeln
  const allMissing = new Set<string>();

  // Bausteine rendern
  const bausteinHtmlParts: string[] = [];
  let currentKategorie = "";

  for (const baustein of parsed.bausteine) {
    // Kategorie-Ueberschrift bei Wechsel
    if (baustein.kategorie !== currentKategorie) {
      currentKategorie = baustein.kategorie;
      const label = kategorieLabel(currentKategorie);
      if (label) {
        bausteinHtmlParts.push(`<h2>${escapeHtml(label)}</h2>`);
      }
    }

    const { resolved, missing } = resolvePlaceholders(baustein.inhalt, werte);
    missing.forEach((m) => allMissing.add(m));

    // Fehlende Platzhalter rot hervorheben
    const htmlContent = resolved.replace(
      /\{\{([a-z_]+)\}\}/g,
      '<span class="missing-placeholder" style="color: red; background: #ffe0e0; padding: 0 4px;">{{$1}}</span>'
    );

    bausteinHtmlParts.push(`<div class="baustein">${nl2br(htmlContent)}</div>`);
  }

  // Nebenbestimmungen rendern
  let nebenbestimmungenHtml = "";
  if (parsed.nebenbestimmungen.length > 0) {
    nebenbestimmungenHtml = '<h2>Nebenbestimmungen</h2><ol class="nebenbestimmungen">';
    for (const nb of parsed.nebenbestimmungen) {
      const { resolved, missing } = resolvePlaceholders(nb.text, werte);
      missing.forEach((m) => allMissing.add(m));

      const htmlContent = resolved.replace(
        /\{\{([a-z_]+)\}\}/g,
        '<span class="missing-placeholder" style="color: red; background: #ffe0e0; padding: 0 4px;">{{$1}}</span>'
      );
      nebenbestimmungenHtml += `<li>${nl2br(htmlContent)}</li>`;
    }
    nebenbestimmungenHtml += "</ol>";
  }

  // HTML-Dokument zusammenbauen
  const bescheidtypLabel = bescheidtypAnzeige(parsed.bescheidtyp);
  const aktenzeichen = werte.aktenzeichen ?? "";
  const datum = werte.datum ?? "";
  const behoerde = werte.behoerde_name ?? "";

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.6; max-width: 210mm; margin: 0 auto; padding: 20mm; }
    .briefkopf { margin-bottom: 30px; }
    .briefkopf .behoerde { font-weight: bold; font-size: 14pt; }
    .aktenzeichen { margin-top: 20px; }
    .bescheidtyp { font-size: 14pt; font-weight: bold; margin: 30px 0 20px; text-align: center; }
    .baustein { margin-bottom: 15px; }
    h2 { font-size: 12pt; font-weight: bold; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    .nebenbestimmungen li { margin-bottom: 10px; }
    .missing-placeholder { color: red; background: #ffe0e0; padding: 0 4px; }
  </style>
</head>
<body>
  <div class="briefkopf">
    <div class="behoerde">${escapeHtml(behoerde)}</div>
  </div>
  <div class="aktenzeichen">Aktenzeichen: ${escapeHtml(aktenzeichen)}</div>
  <div class="datum">${escapeHtml(datum)}</div>
  <div class="bescheidtyp">${escapeHtml(bescheidtypLabel)}</div>
  ${bausteinHtmlParts.join("\n  ")}
  ${nebenbestimmungenHtml}
</body>
</html>`;

  return {
    html,
    missing: Array.from(allMissing).sort(),
    error: null,
  };
}

// -- Hilfsfunktionen --

function kategorieLabel(kategorie: string): string {
  const labels: Record<string, string> = {
    einleitung: "",
    tenor: "Tenor",
    nebenbestimmungen: "Nebenbestimmungen",
    begruendung: "Begründung",
    rechtsbehelfsbelehrung: "Rechtsbehelfsbelehrung",
    sonstiges: "Sonstiges",
  };
  return labels[kategorie] ?? kategorie;
}

function bescheidtypAnzeige(typ: string): string {
  const labels: Record<string, string> = {
    genehmigung: "Baugenehmigung",
    ablehnung: "Ablehnungsbescheid",
    vorbescheid: "Vorbescheid",
    teilgenehmigung: "Teilgenehmigung",
  };
  return labels[typ] ?? typ;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(text: string): string {
  return text.replace(/\n/g, "<br>");
}
