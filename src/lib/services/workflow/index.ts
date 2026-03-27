import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { ladeConfigFristen, createFrist } from "@/lib/services/fristen";
import type { UserRole } from "@/lib/api/auth";
import { hasMinRole } from "@/lib/api/auth";

const VALID_ROLES: Set<string> = new Set(["sachbearbeiter", "referatsleiter", "amtsleiter", "tenant_admin", "platform_admin"]);
import type { WorkflowDefinition, WorkflowSchritt, WorkflowSchrittHistorie, WorkflowAktion } from "./types";
import { WorkflowDefinitionDbSchema, WorkflowSchrittHistorieDbSchema } from "./types";

/**
 * WorkflowService (ADR-011, ADR-003)
 *
 * Datengetriebene State Machine. Laedt Workflow-Definitionen aus config_workflows
 * und validiert/ausfuehrt Schritt-Uebergaenge.
 */

export async function getWorkflowDefinition(
  serviceClient: SupabaseClient,
  verfahrensartId: string,
  bundesland: string
): Promise<WorkflowDefinition | null> {
  const { data } = await serviceClient
    .from("config_workflows")
    .select("definition")
    .eq("verfahrensart_id", verfahrensartId)
    .eq("bundesland", bundesland)
    .eq("aktiv", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return WorkflowDefinitionDbSchema.parse(data.definition);
}

export function getSchritt(
  definition: WorkflowDefinition,
  schrittId: string
): WorkflowSchritt | undefined {
  return definition.schritte.find((s) => s.id === schrittId);
}

export function getVerfuegbareAktionen(
  definition: WorkflowDefinition,
  aktuellerSchrittId: string,
  userRole: UserRole
): { aktionen: WorkflowSchritt["aktionen"]; schritt: WorkflowSchritt | null } {
  const schritt = getSchritt(definition, aktuellerSchrittId);
  if (!schritt) return { aktionen: [], schritt: null };

  // Freigabe-Schritte: Nur mit Mindestrolle ausfuehrbar (B-33-02: validiert statt Cast)
  if (schritt.typ === "freigabe" && schritt.minRolle) {
    if (!VALID_ROLES.has(schritt.minRolle)) {
      console.warn(`[PROJ-33] Ungueltige minRolle "${schritt.minRolle}" in Workflow-Schritt "${schritt.id}"`);
      return { aktionen: [], schritt };
    }
    if (!hasMinRole(userRole, schritt.minRolle as UserRole)) {
      return { aktionen: [], schritt };
    }
  }

  return { aktionen: schritt.aktionen, schritt };
}

/**
 * PROJ-33: Prueft ob eine Aktion eine Zurueckweisung ist.
 * Bevorzugt explizites Flag (B-33-01 Fix), Fallback auf String-Konvention.
 */
export function isZurueckweisungsAktion(aktion: WorkflowAktion): boolean {
  if (aktion.zurueckweisung !== undefined) return aktion.zurueckweisung;
  return aktion.id.includes("zurueck");
}

interface ExecuteAktionParams {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  vorgangId: string;
  aktuellerSchrittId: string;
  aktionId: string;
  begruendung?: string;
  verfahrensartId: string;
  bundesland: string;
}

interface FristErstellt {
  id: string;
  typ: string;
  end_datum: string;
  status: string;
}

export async function executeWorkflowAktion(
  serviceClient: SupabaseClient,
  params: ExecuteAktionParams
): Promise<{ neuerSchrittId: string | null; fristErstellt: FristErstellt | null; error: string | null }> {
  // 1. Workflow-Definition laden
  const definition = await getWorkflowDefinition(
    serviceClient,
    params.verfahrensartId,
    params.bundesland
  );

  if (!definition) {
    return { neuerSchrittId: null, fristErstellt: null, error: "Keine Workflow-Definition gefunden" };
  }

  // 2. Aktuellen Schritt und Aktionen pruefen
  const { aktionen, schritt } = getVerfuegbareAktionen(
    definition,
    params.aktuellerSchrittId,
    params.userRole
  );

  if (!schritt) {
    return { neuerSchrittId: null, fristErstellt: null, error: "Aktueller Workflow-Schritt nicht gefunden" };
  }

  // 3. Aktion finden
  const aktion = aktionen.find((a) => a.id === params.aktionId);
  if (!aktion) {
    return { neuerSchrittId: null, fristErstellt: null, error: "Diese Aktion ist nicht verfügbar" };
  }

  // PROJ-33 AC-2: Begruendungspflicht bei Zurueckweisung in Freigabe-Schritten
  if (schritt.typ === "freigabe" && isZurueckweisungsAktion(aktion)) {
    if (!params.begruendung || params.begruendung.trim().length < 10) {
      return { neuerSchrittId: null, fristErstellt: null, error: "Begründung ist Pflicht bei Zurückweisung (mindestens 10 Zeichen)" };
    }
  }

  // 4. Ziel-Schritt validieren
  const zielSchritt = getSchritt(definition, aktion.ziel);
  if (!zielSchritt) {
    return { neuerSchrittId: null, fristErstellt: null, error: "Ziel-Schritt nicht in Workflow-Definition" };
  }

  // 5. Vorgang aktualisieren
  const { error: updateError } = await serviceClient
    .from("vorgaenge")
    .update({ workflow_schritt_id: aktion.ziel })
    .eq("id", params.vorgangId)
    .eq("tenant_id", params.tenantId);

  if (updateError) {
    return { neuerSchrittId: null, fristErstellt: null, error: updateError.message };
  }

  // 6. Workflow-Schritt protokollieren
  const { error: insertError } = await serviceClient.from("vorgang_workflow_schritte").insert({
    tenant_id: params.tenantId,
    vorgang_id: params.vorgangId,
    schritt_id: aktion.ziel,
    aktion_id: params.aktionId,
    begruendung: params.begruendung ?? null,
    uebersprungen: false,
    ausgefuehrt_von: params.userId,
  });
  if (insertError) {
    console.error("[PROJ-3] Workflow-Schritt-Insert fehlgeschlagen", insertError.message);
  }

  // 7. Audit-Log
  await writeAuditLog({
    tenantId: params.tenantId,
    userId: params.userId,
    action: "vorgang.workflow_schritt",
    resourceType: "vorgang",
    resourceId: params.vorgangId,
    payload: {
      von: params.aktuellerSchrittId,
      nach: aktion.ziel,
      aktion: params.aktionId,
      begruendung: params.begruendung ?? null,
    },
  });

  // 8. PROJ-19: Auto-Frist bei Schritt-Wechsel
  let fristErstellt: FristErstellt | null = null;
  if (zielSchritt.frist) {
    // Lookup in config_fristen: frist-Attribut ist der Typ-Key
    const configFristen = await ladeConfigFristen(
      serviceClient,
      params.bundesland,
      params.verfahrensartId
    );
    const passendeFrist = configFristen.find((cf) => cf.typ === zielSchritt.frist);

    if (passendeFrist) {
      // AC-6: Duplikat-Schutz — prüfe ob Frist dieses Typs bereits existiert
      const { data: existierendeFristen } = await serviceClient
        .from("vorgang_fristen")
        .select("id")
        .eq("tenant_id", params.tenantId)
        .eq("vorgang_id", params.vorgangId)
        .eq("typ", passendeFrist.typ)
        .eq("aktiv", true)
        .limit(1);

      if (!existierendeFristen || existierendeFristen.length === 0) {
        const fristResult = await createFrist(serviceClient, {
          tenantId: params.tenantId,
          userId: params.userId,
          vorgangId: params.vorgangId,
          typ: passendeFrist.typ,
          bezeichnung: passendeFrist.bezeichnung,
          werktage: passendeFrist.werktage,
          startDatum: new Date().toISOString(),
          bundesland: params.bundesland,
        });

        if (fristResult.data) {
          fristErstellt = {
            id: fristResult.data.id,
            typ: fristResult.data.typ,
            end_datum: fristResult.data.end_datum,
            status: fristResult.data.status,
          };

          // B-19-01: Separate Audit-Action fuer automatisch erstellte Fristen
          await writeAuditLog({
            tenantId: params.tenantId,
            userId: params.userId,
            action: "frist.auto_created",
            resourceType: "vorgang_frist",
            resourceId: fristResult.data.id,
            payload: {
              vorgang_id: params.vorgangId,
              workflow_schritt: aktion.ziel,
              frist_typ: passendeFrist.typ,
              werktage: passendeFrist.werktage,
            },
          });
        }
      }
    } else {
      console.warn(`[PROJ-19] Keine config_fristen fuer typ="${zielSchritt.frist}" bundesland="${params.bundesland}" verfahrensart="${params.verfahrensartId}"`);
    }
  }

  return { neuerSchrittId: aktion.ziel, fristErstellt, error: null };
}

export async function getWorkflowHistorie(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<{ data: WorkflowSchrittHistorie[]; error: string | null }> {
  const { data, error } = await serviceClient
    .from("vorgang_workflow_schritte")
    .select("id, vorgang_id, schritt_id, aktion_id, begruendung, uebersprungen, ausgefuehrt_von, ausgefuehrt_am")
    .eq("tenant_id", tenantId)
    .eq("vorgang_id", vorgangId)
    .order("ausgefuehrt_am", { ascending: true })
    .limit(200);

  if (error) return { data: [], error: error.message };
  const parsed = (data ?? []).map((d: unknown) => WorkflowSchrittHistorieDbSchema.parse(d));
  return { data: parsed, error: null };
}
