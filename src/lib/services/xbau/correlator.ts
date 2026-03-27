import { SupabaseClient } from "@supabase/supabase-js";
import type { XBauBezug } from "./types";

/**
 * XBau-Nachrichtenkorrelation (PROJ-7 US-1b, ADR-015)
 *
 * Dreistufige Zuordnung eingehender Nachrichten zu Vorgängen
 * über das bezug-Element. Tenant-isoliert.
 */

export interface KorrelationsErgebnis {
  vorgangId: string | null;
  matchTyp: "aktenzeichen" | "referenz" | "nachrichten_uuid" | "kein_match";
  mehrfachMatch: boolean;
}

/**
 * Ordnet eine Nachricht über ihr bezug-Element einem Vorgang zu.
 * Reihenfolge: (1) Aktenzeichen → (2) Referenz-UUID → (3) Nachrichten-UUID.
 * Alle Queries filtern auf tenant_id (Cross-Tenant ausgeschlossen).
 */
export async function korreliereNachricht(
  serviceClient: SupabaseClient,
  tenantId: string,
  bezug: XBauBezug
): Promise<KorrelationsErgebnis> {
  // 1. bezug.vorgang → vorgaenge.aktenzeichen
  if (bezug.vorgang) {
    const { data } = await serviceClient
      .from("vorgaenge")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("aktenzeichen", bezug.vorgang)
      .is("deleted_at", null)
      .limit(2);

    if (data && data.length === 1) {
      return { vorgangId: data[0].id, matchTyp: "aktenzeichen", mehrfachMatch: false };
    }
    if (data && data.length > 1) {
      return { vorgangId: null, matchTyp: "aktenzeichen", mehrfachMatch: true };
    }
  }

  // 2. bezug.referenz → xbau_nachrichten.referenz_uuid
  if (bezug.referenz) {
    const { data } = await serviceClient
      .from("xbau_nachrichten")
      .select("vorgang_id")
      .eq("tenant_id", tenantId)
      .eq("referenz_uuid", bezug.referenz)
      .not("vorgang_id", "is", null)
      .limit(2);

    if (data && data.length >= 1) {
      const uniqueVorgangIds = [...new Set(data.map((d: Record<string, unknown>) => d.vorgang_id))];
      if (uniqueVorgangIds.length === 1) {
        return { vorgangId: uniqueVorgangIds[0] as string, matchTyp: "referenz", mehrfachMatch: false };
      }
      return { vorgangId: null, matchTyp: "referenz", mehrfachMatch: true };
    }
  }

  // 3. bezug.bezugNachricht.nachrichtenUUID → xbau_nachrichten.nachrichten_uuid
  if (bezug.bezugNachricht?.nachrichtenUUID) {
    const { data } = await serviceClient
      .from("xbau_nachrichten")
      .select("vorgang_id")
      .eq("tenant_id", tenantId)
      .eq("nachrichten_uuid", bezug.bezugNachricht.nachrichtenUUID)
      .not("vorgang_id", "is", null)
      .limit(1);

    if (data && data.length === 1 && data[0].vorgang_id) {
      return { vorgangId: data[0].vorgang_id as string, matchTyp: "nachrichten_uuid", mehrfachMatch: false };
    }
  }

  return { vorgangId: null, matchTyp: "kein_match", mehrfachMatch: false };
}
