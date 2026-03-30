import { SupabaseClient } from "@supabase/supabase-js";
import { VorgangFristDbSchema } from "@/lib/services/fristen/types";
import { VorgangListItemDbSchema } from "@/lib/services/verfahren/types";
import { WorkflowDefinitionDbSchema } from "@/lib/services/workflow/types";
import { addiereWerktage } from "@/lib/services/fristen/werktage";
import type { MeineFrist, MeineAufgabe, KuerzlichBearbeitet } from "./types";
import { KuerzlichBearbeitetSchema } from "./types";

/**
 * TagesansichtService (PROJ-29)
 *
 * Aggregiert persoenliche Tagesuebersicht: Fristen, Aufgaben, kuerzlich bearbeitete Vorgaenge.
 * Erhaelt Supabase-Client als Parameter (DI). Kennt kein HTTP.
 */

const FRISTEN_LIMIT = 10;
const AUFGABEN_LIMIT = 10;
const KUERZLICH_LIMIT = 5;

/**
 * Laedt gefaehrdete Fristen fuer einen Sachbearbeiter.
 * Filtert auf: aktiv=true, gelb/rot/dunkelrot, zustaendiger_user_id=userId,
 * end_datum <= jetzt + 5 Werktage.
 */
export async function ladeMeineFristen(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<{ data: MeineFrist[]; error: string | null }> {
  // 5-Werktage-Fenster berechnen (ohne Feiertage — Naeherung, da BL nicht bekannt)
  const jetzt = new Date();
  const fensterEnde = addiereWerktage(jetzt, 5, new Set());

  const { data, error } = await serviceClient
    .from("vorgang_fristen")
    .select(
      "*, vorgaenge!inner(aktenzeichen, bezeichnung, zustaendiger_user_id)"
    )
    .eq("tenant_id", tenantId)
    .eq("aktiv", true)
    .in("status", ["gelb", "rot", "dunkelrot"])
    .lte("end_datum", fensterEnde.toISOString())
    .eq("vorgaenge.zustaendiger_user_id", userId)
    .order("end_datum", { ascending: true })
    .limit(FRISTEN_LIMIT);

  if (error) return { data: [], error: error.message };

  const result: MeineFrist[] = (data ?? []).map(
    (row: Record<string, unknown>) => {
      const vorgaenge = row.vorgaenge as Record<string, unknown>;
      const { vorgaenge: _v, ...fristData } = row;
      return {
        frist: VorgangFristDbSchema.parse(fristData),
        vorgang_aktenzeichen: vorgaenge.aktenzeichen as string,
        vorgang_bezeichnung: (vorgaenge.bezeichnung as string) ?? null,
      };
    }
  );

  return { data: result, error: null };
}

/**
 * Sammelt alle Endstatus-Schritt-IDs aus den aktiven Workflow-Definitionen.
 */
async function ladeEndstatusSchrittIds(
  serviceClient: SupabaseClient
): Promise<Set<string>> {
  const { data } = await serviceClient
    .from("config_workflows")
    .select("definition")
    .eq("aktiv", true)
    .limit(100);

  const ids = new Set<string>();
  if (!data) return ids;

  for (const row of data) {
    const def = WorkflowDefinitionDbSchema.safeParse(
      (row as Record<string, unknown>).definition
    );
    if (!def.success) continue;
    for (const schritt of def.data.schritte) {
      if (schritt.typ === "endstatus") {
        ids.add(schritt.id);
      }
    }
  }

  return ids;
}

/**
 * Laedt dem Sachbearbeiter zugewiesene Vorgaenge, die nicht in einem Endstatus sind.
 */
export async function ladeMeineAufgaben(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<{ data: MeineAufgabe[]; error: string | null }> {
  // Endstatus-IDs laden, um abgeschlossene Vorgaenge auszufiltern
  const endstatusIds = await ladeEndstatusSchrittIds(serviceClient);

  let query = serviceClient
    .from("vorgaenge")
    .select(
      "id, aktenzeichen, bauherr_name, grundstueck_adresse, bezeichnung, workflow_schritt_id, zustaendiger_user_id, eingangsdatum, verfahrensart_id"
    )
    .eq("tenant_id", tenantId)
    .eq("zustaendiger_user_id", userId)
    .is("deleted_at", null)
    .order("eingangsdatum", { ascending: false })
    .limit(AUFGABEN_LIMIT);

  // Endstatus ausschliessen (nur wenn welche bekannt sind)
  if (endstatusIds.size > 0) {
    const idArray = Array.from(endstatusIds);
    // PostgREST: not.in filter
    query = query.not(
      "workflow_schritt_id",
      "in",
      `(${idArray.join(",")})`
    );
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  const parsed = (data ?? []).map((d: unknown) =>
    VorgangListItemDbSchema.parse(d)
  );
  return { data: parsed, error: null };
}

/**
 * Laedt die zuletzt vom Sachbearbeiter bearbeiteten Vorgaenge (DISTINCT ON vorgang_id).
 * Nutzt workflow_schritt_historie mit JOIN auf vorgaenge.
 */
export async function ladeKuerzlichBearbeitet(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<{ data: KuerzlichBearbeitet[]; error: string | null }> {
  // Supabase JS Client unterstuetzt kein DISTINCT ON.
  // Workaround: Lade letzte N Historie-Eintraege des Users, dedupliziere im Code.
  const { data: historieData, error: historieError } = await serviceClient
    .from("workflow_schritt_historie")
    .select("id, vorgang_id, schritt_id, ausgefuehrt_am")
    .eq("ausgefuehrt_von", userId)
    .order("ausgefuehrt_am", { ascending: false })
    .limit(50);

  if (historieError) return { data: [], error: historieError.message };

  // Dedupliziere nach vorgang_id (erster Eintrag = neuester)
  const gesehen = new Set<string>();
  const eindeutig: Array<{ vorgang_id: string; schritt_id: string; ausgefuehrt_am: string }> = [];
  for (const row of historieData ?? []) {
    const r = row as Record<string, unknown>;
    const vorgangId = r.vorgang_id as string;
    if (!gesehen.has(vorgangId)) {
      gesehen.add(vorgangId);
      eindeutig.push({
        vorgang_id: vorgangId,
        schritt_id: r.schritt_id as string,
        ausgefuehrt_am: r.ausgefuehrt_am as string,
      });
    }
    if (eindeutig.length >= KUERZLICH_LIMIT) break;
  }

  if (eindeutig.length === 0) return { data: [], error: null };

  // Vorgang-Details nachladen (nur fuer die eindeutigen IDs)
  const vorgangIds = eindeutig.map((e) => e.vorgang_id);
  const { data: vorgaenge, error: vorgaengeError } = await serviceClient
    .from("vorgaenge")
    .select("id, aktenzeichen, bezeichnung, workflow_schritt_id")
    .eq("tenant_id", tenantId)
    .in("id", vorgangIds)
    .is("deleted_at", null)
    .limit(KUERZLICH_LIMIT);

  if (vorgaengeError) return { data: [], error: vorgaengeError.message };

  // Vorgang-Map fuer schnellen Lookup
  const vorgangMap = new Map<string, Record<string, unknown>>();
  for (const v of vorgaenge ?? []) {
    const vr = v as Record<string, unknown>;
    vorgangMap.set(vr.id as string, vr);
  }

  // Zusammenfuegen: nur Eintraege mit existierendem Vorgang (Tenant-Filter)
  const result: KuerzlichBearbeitet[] = [];
  for (const eintrag of eindeutig) {
    const vorgang = vorgangMap.get(eintrag.vorgang_id);
    if (!vorgang) continue; // Vorgang geloescht oder anderer Tenant

    result.push(
      KuerzlichBearbeitetSchema.parse({
        vorgang_id: eintrag.vorgang_id,
        aktenzeichen: vorgang.aktenzeichen,
        bezeichnung: vorgang.bezeichnung ?? null,
        workflow_schritt_id: vorgang.workflow_schritt_id,
        ausgefuehrt_am: eintrag.ausgefuehrt_am,
        schritt_id: eintrag.schritt_id,
      })
    );
  }

  return { data: result, error: null };
}
