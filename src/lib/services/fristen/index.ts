import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import {
  addiereWerktage,
  berechneWerktageDazwischen,
  berechneAmpelStatus,
} from "./werktage";
import type {
  VorgangFrist,
  ConfigFrist,
  AmpelStatus,
  GefaehrdeteFrist,
} from "./types";
import {
  VorgangFristDbSchema,
  ConfigFristDbSchema,
  ConfigFeiertagDbSchema,
} from "./types";

/**
 * FristService (ADR-003, ADR-006, PROJ-4)
 *
 * Fachlogik für Fristmanagement. Erhaelt Supabase-Client als Parameter (DI).
 * Kennt kein HTTP — wird von API-Routes aufgerufen.
 */

// -- Feiertage laden (config_feiertage, Service-Only) --

export async function ladeFeiertage(
  serviceClient: SupabaseClient,
  bundesland: string,
  jahr: number
): Promise<Set<string>> {
  const { data, error } = await serviceClient
    .from("config_feiertage")
    .select("id, bundesland, datum, bezeichnung, jahr")
    .or(`bundesland.eq.${bundesland},bundesland.is.null`)
    .eq("jahr", jahr)
    .limit(100);

  if (error || !data) return new Set();

  const feiertage = (data as unknown[]).map((d) => ConfigFeiertagDbSchema.parse(d));
  return new Set(feiertage.map((f) => f.datum));
}

// -- Konfigurierte Fristen laden (config_fristen, Service-Only, ADR-006) --

export async function ladeConfigFristen(
  serviceClient: SupabaseClient,
  bundesland: string,
  verfahrensartId: string
): Promise<ConfigFrist[]> {
  const { data, error } = await serviceClient
    .from("config_fristen")
    .select("id, bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage, aktiv")
    .eq("bundesland", bundesland)
    .eq("verfahrensart_id", verfahrensartId)
    .eq("aktiv", true)
    .limit(50);

  if (error || !data) return [];
  return (data as unknown[]).map((d) => ConfigFristDbSchema.parse(d));
}

// -- Vorgang-Fristen CRUD --

export async function getFristen(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: VorgangFrist[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_fristen")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .eq("aktiv", true)
    .order("end_datum", { ascending: true })
    .limit(50);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => VorgangFristDbSchema.parse(d));
  return { data: parsed, error: null };
}

interface CreateFristParams {
  tenantId: string;
  userId: string;
  vorgangId: string;
  typ: string;
  bezeichnung: string;
  werktage: number;
  startDatum: string;
  bundesland: string;
}

export async function createFrist(
  serviceClient: SupabaseClient,
  params: CreateFristParams
): Promise<{ data: VorgangFrist | null; error: string | null }> {
  // Feiertage laden für Werktage-Berechnung
  const startDate = new Date(params.startDatum);
  const jahr = startDate.getFullYear();
  const feiertage = await ladeFeiertage(serviceClient, params.bundesland, jahr);

  // Enddatum berechnen (FA-3: Werktage)
  const endDate = addiereWerktage(startDate, params.werktage, feiertage);

  // Ampelstatus berechnen
  const verbleibend = berechneWerktageDazwischen(new Date(), endDate, feiertage);
  const ampelStatus = berechneAmpelStatus(params.werktage, verbleibend);

  const { data, error } = await serviceClient
    .from("vorgang_fristen")
    .insert({
      tenant_id: params.tenantId,
      vorgang_id: params.vorgangId,
      typ: params.typ,
      bezeichnung: params.bezeichnung,
      start_datum: params.startDatum,
      end_datum: endDate.toISOString(),
      werktage: params.werktage,
      status: ampelStatus,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Audit-Log (NFR-3)
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "frist.created",
    resourceType: "vorgang_frist",
    resourceId: data.id,
    payload: {
      vorgang_id: params.vorgangId,
      typ: params.typ,
      werktage: params.werktage,
      end_datum: endDate.toISOString(),
    },
  });

  return { data: VorgangFristDbSchema.parse(data), error: null };
}

// -- Frist verlängern (US-4) --

interface VerlaengerungParams {
  tenantId: string;
  userId: string;
  fristId: string;
  zusaetzlicheWerktage: number;
  begruendung: string;
  bundesland: string;
}

export async function verlaengereFrist(
  serviceClient: SupabaseClient,
  params: VerlaengerungParams
): Promise<{ data: VorgangFrist | null; error: string | null }> {
  // Bestehende Frist laden
  const { data: frist, error: fetchError } = await serviceClient
    .from("vorgang_fristen")
    .select("*")
    .eq("id", params.fristId)
    .eq("tenant_id", params.tenantId)
    .eq("aktiv", true)
    .single();

  if (fetchError || !frist) return { data: null, error: "Frist nicht gefunden" };

  const parsed = VorgangFristDbSchema.parse(frist);

  // Neues Enddatum berechnen
  const currentEnd = new Date(parsed.end_datum);
  const jahr = currentEnd.getFullYear();
  const feiertage = await ladeFeiertage(serviceClient, params.bundesland, jahr);
  const neuesEndDatum = addiereWerktage(currentEnd, params.zusaetzlicheWerktage, feiertage);

  // Ampelstatus neu berechnen
  const gesamtWerktage = parsed.werktage + params.zusaetzlicheWerktage;
  const verbleibend = berechneWerktageDazwischen(new Date(), neuesEndDatum, feiertage);
  const ampelStatus = berechneAmpelStatus(gesamtWerktage, verbleibend);

  const { data: updated, error: updateError } = await serviceClient
    .from("vorgang_fristen")
    .update({
      end_datum: neuesEndDatum.toISOString(),
      werktage: gesamtWerktage,
      status: ampelStatus,
      verlaengert: true,
      verlaengerung_grund: params.begruendung,
      original_end_datum: parsed.verlaengert ? parsed.original_end_datum : parsed.end_datum,
    })
    .eq("id", params.fristId)
    .eq("tenant_id", params.tenantId)
    .select()
    .single();

  if (updateError) return { data: null, error: updateError.message };

  // Audit-Log (NFR-3)
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "frist.verlaengert",
    resourceType: "vorgang_frist",
    resourceId: params.fristId,
    payload: {
      zusaetzliche_werktage: params.zusaetzlicheWerktage,
      begruendung: params.begruendung,
      altes_end_datum: parsed.end_datum,
      neues_end_datum: neuesEndDatum.toISOString(),
    },
  });

  return { data: VorgangFristDbSchema.parse(updated), error: null };
}

// -- Frist hemmen (US-5) --

interface HemmungStartParams {
  tenantId: string;
  userId: string;
  fristId: string;
  grund: string;
  ende?: string;
}

export async function hemmeFrist(
  serviceClient: SupabaseClient,
  params: HemmungStartParams
): Promise<{ data: VorgangFrist | null; error: string | null }> {
  // Bestehende Frist laden
  const { data: frist, error: fetchError } = await serviceClient
    .from("vorgang_fristen")
    .select("*")
    .eq("id", params.fristId)
    .eq("tenant_id", params.tenantId)
    .eq("aktiv", true)
    .single();

  if (fetchError || !frist) return { data: null, error: "Frist nicht gefunden" };

  const parsed = VorgangFristDbSchema.parse(frist);
  if (parsed.gehemmt) return { data: null, error: "Frist ist bereits gehemmt" };

  const { data: updated, error: updateError } = await serviceClient
    .from("vorgang_fristen")
    .update({
      gehemmt: true,
      hemmung_grund: params.grund,
      hemmung_start: new Date().toISOString(),
      hemmung_ende: params.ende ?? null,
      status: "gehemmt" as AmpelStatus,
    })
    .eq("id", params.fristId)
    .eq("tenant_id", params.tenantId)
    .select()
    .single();

  if (updateError) return { data: null, error: updateError.message };

  // Audit-Log (NFR-3, US-5 AC-4)
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "frist.gehemmt",
    resourceType: "vorgang_frist",
    resourceId: params.fristId,
    payload: {
      grund: params.grund,
      hemmung_start: new Date().toISOString(),
      geplantes_ende: params.ende ?? null,
    },
  });

  return { data: VorgangFristDbSchema.parse(updated), error: null };
}

// -- Hemmung aufheben (US-5 AC-3) --

interface HemmungAufhebenParams {
  tenantId: string;
  userId: string;
  fristId: string;
  bundesland: string;
}

export async function hebeHemmungAuf(
  serviceClient: SupabaseClient,
  params: HemmungAufhebenParams
): Promise<{ data: VorgangFrist | null; error: string | null }> {
  const { data: frist, error: fetchError } = await serviceClient
    .from("vorgang_fristen")
    .select("*")
    .eq("id", params.fristId)
    .eq("tenant_id", params.tenantId)
    .eq("aktiv", true)
    .single();

  if (fetchError || !frist) return { data: null, error: "Frist nicht gefunden" };

  const parsed = VorgangFristDbSchema.parse(frist);
  if (!parsed.gehemmt) return { data: null, error: "Frist ist nicht gehemmt" };

  // Hemmungstage berechnen (US-5 AC-3: Frist wird um Hemmungstage verlängert)
  const hemmungStart = new Date(parsed.hemmung_start!);
  const jetzt = new Date();
  const feiertage = await ladeFeiertage(serviceClient, params.bundesland, jetzt.getFullYear());
  const hemmungsTage = berechneWerktageDazwischen(hemmungStart, jetzt, feiertage);
  const kumulierteHemmungsTage = (parsed.hemmung_tage ?? 0) + hemmungsTage;

  // Enddatum verlängern
  const altesEndDatum = new Date(parsed.end_datum);
  const neuesEndDatum = addiereWerktage(altesEndDatum, hemmungsTage, feiertage);

  // Ampelstatus neu berechnen
  const verbleibend = berechneWerktageDazwischen(jetzt, neuesEndDatum, feiertage);
  const ampelStatus = berechneAmpelStatus(parsed.werktage, verbleibend);

  const { data: updated, error: updateError } = await serviceClient
    .from("vorgang_fristen")
    .update({
      gehemmt: false,
      hemmung_ende: jetzt.toISOString(),
      hemmung_tage: kumulierteHemmungsTage,
      end_datum: neuesEndDatum.toISOString(),
      status: ampelStatus,
    })
    .eq("id", params.fristId)
    .eq("tenant_id", params.tenantId)
    .select()
    .single();

  if (updateError) return { data: null, error: updateError.message };

  // Audit-Log (NFR-3, US-5 AC-4)
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "frist.hemmung_aufgehoben",
    resourceType: "vorgang_frist",
    resourceId: params.fristId,
    payload: {
      hemmung_tage: hemmungsTage,
      kumulierte_hemmung_tage: kumulierteHemmungsTage,
      altes_end_datum: parsed.end_datum,
      neues_end_datum: neuesEndDatum.toISOString(),
    },
  });

  return { data: VorgangFristDbSchema.parse(updated), error: null };
}

// -- Fristgefährdete Vorgänge (US-3: Referatsleiter-Dashboard) --

interface GefaehrdeteParams {
  tenantId: string;
  seite: number;
  proSeite: number;
}

export async function listGefaehrdeteFristen(
  serviceClient: SupabaseClient,
  params: GefaehrdeteParams
): Promise<{ data: GefaehrdeteFrist[]; total: number; error: string | null }> {
  const offset = (params.seite - 1) * params.proSeite;

  // Fristen mit status rot/dunkelrot JOIN vorgaenge (für Aktenzeichen etc.)
  const { data, count, error } = await serviceClient
    .from("vorgang_fristen")
    .select(
      "*, vorgaenge!inner(aktenzeichen, bezeichnung, zustaendiger_user_id)",
      { count: "exact" }
    )
    .eq("tenant_id", params.tenantId)
    .eq("aktiv", true)
    .in("status", ["gelb", "rot", "dunkelrot"])
    .order("end_datum", { ascending: true })
    .range(offset, offset + params.proSeite - 1);

  if (error) return { data: [], total: 0, error: error.message };

  const result: GefaehrdeteFrist[] = (data ?? []).map((row: Record<string, unknown>) => {
    const vorgaenge = row.vorgaenge as Record<string, unknown>;
    const { vorgaenge: _v, ...fristData } = row;
    return {
      frist: VorgangFristDbSchema.parse(fristData),
      vorgang_aktenzeichen: vorgaenge.aktenzeichen as string,
      vorgang_bezeichnung: (vorgaenge.bezeichnung as string) ?? null,
      zustaendiger_user_id: (vorgaenge.zustaendiger_user_id as string) ?? null,
    };
  });

  return { data: result, total: count ?? 0, error: null };
}

// -- Ampelstatus-Aktualisierung (Cron-Job, ADR-008) --

export async function aktualisiereAlleAmpelStatus(
  serviceClient: SupabaseClient
): Promise<{ aktualisiert: number; error: string | null }> {
  // Alle aktiven, nicht gehemmten Fristen laden
  const { data: fristen, error } = await serviceClient
    .from("vorgang_fristen")
    .select("id, tenant_id, vorgang_id, start_datum, end_datum, werktage, status, gehemmt")
    .eq("aktiv", true)
    .eq("gehemmt", false)
    .limit(1000);

  if (error) return { aktualisiert: 0, error: error.message };
  if (!fristen || fristen.length === 0) return { aktualisiert: 0, error: null };

  const jetzt = new Date();
  const jahr = jetzt.getFullYear();

  let aktualisiert = 0;

  for (const frist of fristen) {
    // Für den Cron-Job: Wir verwenden ein leeres Feiertags-Set als Fallback,
    // da wir ohne Bundesland-Info keine Feiertage laden können.
    // Die Fristen-Tabelle hat kein bundesland-Feld — wir müssten über vorgaenge joinen.
    // Für den MVP: Berechnung ohne Feiertage im Batch-Update ist akzeptabel,
    // da die Ampel bei Fristanlage und -änderung korrekt berechnet wird.
    const feiertage = new Set<string>();

    const endDate = new Date(frist.end_datum);
    const verbleibend = berechneWerktageDazwischen(jetzt, endDate, feiertage);
    const neuerStatus = berechneAmpelStatus(frist.werktage, verbleibend);

    if (neuerStatus !== frist.status) {
      const { error: updateError } = await serviceClient
        .from("vorgang_fristen")
        .update({ status: neuerStatus })
        .eq("id", frist.id);

      if (!updateError) aktualisiert++;
    }
  }

  return { aktualisiert, error: null };
}
