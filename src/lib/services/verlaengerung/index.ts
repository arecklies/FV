import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { resolveUserEmails } from "@/lib/services/user-resolver";
import type { VerlaengerungMitEmail } from "./types";
import { VerlaengerungDbSchema } from "./types";

/**
 * VerlaengerungService (PROJ-48)
 *
 * Verlängerung der Geltungsdauer erteilter Baugenehmigungen.
 * Eigenständiger Service — Verlängerung ist kein Workflow-Übergang,
 * sondern ein Verwaltungsakt auf einem abgeschlossenen Vorgang.
 */

interface CreateVerlaengerungParams {
  tenantId: string;
  userId: string;
  vorgangId: string;
  antragsdatum: string;
  begruendung: string;
  verlaengerungTage: number;
}

interface CreateVerlaengerungResult {
  data: { id: string; neues_datum: string } | null;
  error: string | null;
}

export async function createVerlaengerung(
  serviceClient: SupabaseClient,
  params: CreateVerlaengerungParams
): Promise<CreateVerlaengerungResult> {
  // 1. Vorgang laden (inkl. geltungsdauer_bis, verfahrensart_id)
  const { data: vorgang, error: vorgangError } = await serviceClient
    .from("vorgaenge")
    .select("id, tenant_id, workflow_schritt_id, geltungsdauer_bis, verfahrensart_id")
    .eq("id", params.vorgangId)
    .eq("tenant_id", params.tenantId)
    .is("deleted_at", null)
    .single();

  if (vorgangError || !vorgang) {
    return { data: null, error: "Vorgang nicht gefunden" };
  }

  // 2. Prüfung: Vorgang muss abgeschlossen sein
  if (vorgang.workflow_schritt_id !== "abgeschlossen") {
    return { data: null, error: "Verlängerung nur für abgeschlossene Vorgänge möglich" };
  }

  // 3. Prüfung: Verfahrensart-Kategorie (nur genehmigung, vorbescheid, freistellung)
  const { data: verfahrensart } = await serviceClient
    .from("config_verfahrensarten")
    .select("kategorie")
    .eq("id", vorgang.verfahrensart_id)
    .single();

  if (!verfahrensart) {
    return { data: null, error: "Verfahrensart nicht gefunden" };
  }

  const erlaubteKategorien = ["genehmigung", "vorbescheid", "freistellung"];
  if (!erlaubteKategorien.includes(verfahrensart.kategorie)) {
    return { data: null, error: "Kenntnisgabeverfahren haben keine verlängerbare Geltungsdauer" };
  }

  // 4. Prüfung: Geltungsdauer muss gesetzt und in der Zukunft sein
  if (!vorgang.geltungsdauer_bis) {
    return { data: null, error: "Keine Geltungsdauer gesetzt — bitte zuerst manuell nachpflegen" };
  }

  const geltungsdauerBis = new Date(vorgang.geltungsdauer_bis);
  if (geltungsdauerBis <= new Date()) {
    return { data: null, error: "Genehmigung ist bereits erloschen — Verlängerung nicht mehr möglich" };
  }

  // 5. Neues Ablaufdatum berechnen
  const neuesDatum = new Date(geltungsdauerBis);
  neuesDatum.setDate(neuesDatum.getDate() + params.verlaengerungTage);

  // 6. Verlängerung in Historie schreiben
  const { data: verlaengerung, error: insertError } = await serviceClient
    .from("vorgang_verlaengerungen")
    .insert({
      tenant_id: params.tenantId,
      vorgang_id: params.vorgangId,
      altes_datum: vorgang.geltungsdauer_bis,
      neues_datum: neuesDatum.toISOString(),
      antragsdatum: params.antragsdatum,
      begruendung: params.begruendung,
      verlaengerung_tage: params.verlaengerungTage,
      sachbearbeiter_id: params.userId,
    })
    .select("id")
    .single();

  if (insertError || !verlaengerung) {
    console.error("[PROJ-48] Verlängerung-Insert fehlgeschlagen", insertError?.message);
    return { data: null, error: "Verlängerung konnte nicht gespeichert werden" };
  }

  // 7. Geltungsdauer auf Vorgang aktualisieren
  const { error: updateError } = await serviceClient
    .from("vorgaenge")
    .update({ geltungsdauer_bis: neuesDatum.toISOString() })
    .eq("id", params.vorgangId)
    .eq("tenant_id", params.tenantId);

  if (updateError) {
    console.error("[PROJ-48] Geltungsdauer-Update fehlgeschlagen", updateError.message);
    return { data: null, error: "Geltungsdauer konnte nicht aktualisiert werden" };
  }

  // 8. Audit-Log
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "geltungsdauer.verlaengert",
    resourceType: "vorgang",
    resourceId: params.vorgangId,
    payload: {
      altes_datum: vorgang.geltungsdauer_bis,
      neues_datum: neuesDatum.toISOString(),
      verlaengerung_tage: params.verlaengerungTage,
      antragsdatum: params.antragsdatum,
    },
  });

  return {
    data: { id: verlaengerung.id, neues_datum: neuesDatum.toISOString() },
    error: null,
  };
}

export async function getVerlaengerungen(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: VerlaengerungMitEmail[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_verlaengerungen")
    .select("id, tenant_id, vorgang_id, altes_datum, neues_datum, antragsdatum, begruendung, verlaengerung_tage, sachbearbeiter_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { data: [], error: error.message };

  const parsed = (data ?? []).map((d: unknown) => VerlaengerungDbSchema.parse(d));

  // E-Mail-Adressen der Sachbearbeiter auflösen
  const userIds = parsed.map((v) => v.sachbearbeiter_id);
  const emailMap = await resolveUserEmails(serviceClient, userIds);

  const enriched: VerlaengerungMitEmail[] = parsed.map((v) => ({
    ...v,
    sachbearbeiter_email: emailMap.get(v.sachbearbeiter_id) ?? null,
  }));

  return { data: enriched, error: null };
}

/**
 * Geltungsdauer automatisch setzen bei Workflow-Übergang zu "zustellung".
 * Aufgerufen aus executeWorkflowAktion() (WorkflowService).
 */
export async function setGeltungsdauerBeiZustellung(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  vorgangId: string,
  verfahrensartId: string,
  bundesland: string
): Promise<void> {
  // 1. Verfahrensart-Kategorie prüfen
  const { data: verfahrensart } = await serviceClient
    .from("config_verfahrensarten")
    .select("kategorie")
    .eq("id", verfahrensartId)
    .single();

  if (!verfahrensart) return;

  // Kenntnisgabe: keine Geltungsdauer
  if (verfahrensart.kategorie === "kenntnisgabe") return;

  // 2. Geltungsdauer aus config_fristen laden
  const { data: configFrist } = await serviceClient
    .from("config_fristen")
    .select("kalendertage")
    .eq("bundesland", bundesland)
    .eq("verfahrensart_id", verfahrensartId)
    .eq("typ", "geltungsdauer")
    .eq("aktiv", true)
    .limit(1)
    .single();

  if (!configFrist || !configFrist.kalendertage) {
    console.warn(`[PROJ-48] Keine Geltungsdauer-Konfiguration für bundesland="${bundesland}" verfahrensart="${verfahrensartId}"`);
    return;
  }

  // 3. Ablaufdatum berechnen
  const ablaufdatum = new Date();
  ablaufdatum.setDate(ablaufdatum.getDate() + configFrist.kalendertage);

  // 4. Auf Vorgang setzen
  const { error } = await serviceClient
    .from("vorgaenge")
    .update({ geltungsdauer_bis: ablaufdatum.toISOString() })
    .eq("id", vorgangId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[PROJ-48] Geltungsdauer setzen fehlgeschlagen", error.message);
    return;
  }

  // 5. Audit-Log
  await writeAuditLog({
    tenantId,
    userId,
    action: "geltungsdauer.gesetzt",
    resourceType: "vorgang",
    resourceId: vorgangId,
    payload: {
      geltungsdauer_bis: ablaufdatum.toISOString(),
      kalendertage: configFrist.kalendertage,
    },
  });
}
