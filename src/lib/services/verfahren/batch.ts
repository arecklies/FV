import { SupabaseClient } from "@supabase/supabase-js";
import { zuweiseVorgang, getVorgang } from "@/lib/services/verfahren";
import { executeWorkflowAktion } from "@/lib/services/workflow";
import { verlaengereFrist, getFristen } from "@/lib/services/fristen";
import { writeAuditLog } from "@/lib/services/audit";
import type { UserRole } from "@/lib/api/auth";
import type { BatchAktion, BatchAktionResponse, BatchEinzelErgebnis } from "./types";

/**
 * BatchService (PROJ-17: Massenoperationen)
 *
 * Fuehrt Batch-Aktionen sequenziell aus (for-Schleife, nicht Promise.all).
 * Ruft bestehende Einzel-Services auf, sammelt Ergebnisse pro Vorgang.
 * Kennt kein HTTP — wird von API-Route aufgerufen.
 */

interface BatchContext {
  tenantId: string;
  userId: string;
  userRole: UserRole;
}

export async function executeBatchAktion(
  serviceClient: SupabaseClient,
  context: BatchContext,
  params: BatchAktion
): Promise<BatchAktionResponse> {
  const ergebnisse: BatchEinzelErgebnis[] = [];

  // Sequenzielle Verarbeitung (NFR-1: serverseitig, konsistent)
  for (const vorgangId of params.vorgang_ids) {
    try {
      switch (params.aktion) {
        case "zuweisen": {
          const result = await zuweiseVorgang(
            serviceClient,
            context.tenantId,
            context.userId,
            vorgangId,
            params.zustaendiger_user_id
          );
          ergebnisse.push({
            vorgang_id: vorgangId,
            erfolg: !result.error,
            meldung: result.error ?? "Zugewiesen",
          });
          break;
        }

        case "status_aendern": {
          // Vorgang laden (fuer aktuellen Schritt + Verfahrensart)
          const vorgangResult = await getVorgang(serviceClient, context.tenantId, vorgangId);
          if (vorgangResult.error || !vorgangResult.data) {
            ergebnisse.push({
              vorgang_id: vorgangId,
              erfolg: false,
              meldung: "Vorgang nicht gefunden",
            });
            break;
          }

          const vorgang = vorgangResult.data;
          const result = await executeWorkflowAktion(serviceClient, {
            tenantId: context.tenantId,
            userId: context.userId,
            userRole: context.userRole,
            vorgangId,
            aktuellerSchrittId: vorgang.workflow_schritt_id,
            aktionId: params.aktion_id,
            begruendung: params.begruendung,
            verfahrensartId: vorgang.verfahrensart_id,
            bundesland: vorgang.bundesland,
          });
          ergebnisse.push({
            vorgang_id: vorgangId,
            erfolg: !result.error,
            meldung: result.error ?? `Status geändert nach ${result.neuerSchrittId}`,
          });
          break;
        }

        case "frist_verschieben": {
          // Vorgang laden (fuer Bundesland)
          const vorgangResult2 = await getVorgang(serviceClient, context.tenantId, vorgangId);
          if (vorgangResult2.error || !vorgangResult2.data) {
            ergebnisse.push({
              vorgang_id: vorgangId,
              erfolg: false,
              meldung: "Vorgang nicht gefunden",
            });
            break;
          }

          // Passende aktive Frist des Typs finden
          const fristenResult = await getFristen(serviceClient, context.tenantId, vorgangId);
          const passendeFrist = fristenResult.data.find((f) => f.typ === params.frist_typ);

          if (!passendeFrist) {
            ergebnisse.push({
              vorgang_id: vorgangId,
              erfolg: false,
              meldung: `Keine aktive Frist vom Typ "${params.frist_typ}" gefunden`,
            });
            break;
          }

          const result = await verlaengereFrist(serviceClient, {
            tenantId: context.tenantId,
            userId: context.userId,
            fristId: passendeFrist.id,
            zusaetzlicheWerktage: params.zusaetzliche_werktage,
            begruendung: params.begruendung,
            bundesland: vorgangResult2.data.bundesland,
          });
          ergebnisse.push({
            vorgang_id: vorgangId,
            erfolg: !result.error,
            meldung: result.error ?? "Frist verlängert",
          });
          break;
        }
      }
    } catch (err) {
      console.error(`[PROJ-17] Batch-Fehler fuer Vorgang ${vorgangId}`, err);
      ergebnisse.push({
        vorgang_id: vorgangId,
        erfolg: false,
        meldung: "Interner Fehler bei der Verarbeitung",
      });
    }
  }

  const erfolgreich = ergebnisse.filter((e) => e.erfolg).length;
  const fehlgeschlagen = ergebnisse.filter((e) => !e.erfolg).length;

  // Audit-Log fuer Batch-Operation (PROJ-17)
  await writeAuditLog({
    tenantId: context.tenantId,
    userId: context.userId,
    action: `batch.${params.aktion}`,
    resourceType: "batch",
    resourceId: context.tenantId,
    payload: {
      aktion: params.aktion,
      gesamt: params.vorgang_ids.length,
      erfolgreich,
      fehlgeschlagen,
    },
  });

  return {
    gesamt: params.vorgang_ids.length,
    erfolgreich,
    fehlgeschlagen,
    ergebnisse,
  };
}
