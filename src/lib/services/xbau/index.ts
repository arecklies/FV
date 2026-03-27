import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/services/audit";
import { createVorgang } from "@/lib/services/verfahren";
import { parseRawXml, detectNachrichtentyp, extractNachrichtenkopf, extractBezug, parse0200 } from "./parser";
import { korreliereNachricht } from "./correlator";
import { speichereNachricht, updateNachrichtStatus, istDuplikat } from "./nachricht-store";
import type { XBauNachricht, XBauBezug } from "./types";

/**
 * XBau-Service (PROJ-7, ADR-004, ADR-015)
 *
 * Haupteinstiegspunkt für die Verarbeitung eingehender XBau-Nachrichten.
 * Orchestriert: Parsing → Validierung → Korrelation → Speicherung → Vorgangsanlage.
 */

export interface EmpfangeNachrichtErgebnis {
  nachrichtId: string;
  nachrichtentyp: string;
  status: "verarbeitet" | "abgewiesen" | "zuordnung_ausstehend";
  vorgangId?: string;
  aktenzeichen?: string;
  fehler?: string;
  fehlerkennzahl?: string;
}

/**
 * Empfängt und verarbeitet eine eingehende XBau-Nachricht.
 *
 * Ablauf:
 * 1. XML parsen (fast-xml-parser)
 * 2. Nachrichtenkopf und bezug extrahieren
 * 3. In xbau_nachrichten speichern (status: 'empfangen')
 * 4. XSD-Validierung (Zod-Runtime)
 * 5. Bei Fehler: Status → 'abgewiesen', Rückweisung 1100 generieren
 * 6. Bei Erfolg: Nachricht verarbeiten (0200 → Vorgang anlegen, sonst zuordnen)
 */
export async function empfangeNachricht(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  rohXml: string
): Promise<{ data: EmpfangeNachrichtErgebnis | null; error: string | null }> {
  // 1. Grundprüfung: XML-Struktur
  if (!rohXml.trim().startsWith("<")) {
    return { data: null, error: "Ungültiges XML: Datei enthält kein XML" };
  }

  // 2. XML parsen
  let parsed: Record<string, unknown>;
  try {
    parsed = parseRawXml(rohXml);
  } catch {
    return { data: null, error: "Ungültiges XML: Datei konnte nicht geparst werden" };
  }

  // 3. Nachrichtenkopf extrahieren
  const kopf = extractNachrichtenkopf(parsed);
  const nachrichtentyp = detectNachrichtentyp(parsed) ?? kopf?.nachrichtentyp ?? "unbekannt";
  const nachrichtenUuid = kopf?.nachrichtenUUID ?? crypto.randomUUID();
  const bezug = extractBezug(parsed);

  // 3. Duplikat-Prüfung
  const duplikat = await istDuplikat(serviceClient, tenantId, nachrichtenUuid);
  if (duplikat) {
    return {
      data: {
        nachrichtId: "",
        nachrichtentyp,
        status: "verarbeitet",
        fehler: "Nachricht mit dieser UUID wurde bereits verarbeitet",
      },
      error: null,
    };
  }

  // 4. In xbau_nachrichten speichern (status: 'empfangen')
  const kerndaten = extrahiereKerndaten(parsed, nachrichtentyp);
  const speicherResult = await speichereNachricht(serviceClient, {
    tenantId,
    nachrichtenUuid,
    nachrichtentyp,
    richtung: "eingang",
    status: "empfangen",
    rohXml,
    kerndaten,
    referenzUuid: bezug.referenz ?? undefined,
    bezugNachrichtenUuid: bezug.bezugNachricht?.nachrichtenUUID ?? undefined,
    bezugAktenzeichen: bezug.vorgang ?? undefined,
    absenderBehoerde: kopf?.autor ?? undefined,
    empfaengerBehoerde: kopf?.leser ?? undefined,
  });

  if (speicherResult.error || !speicherResult.data) {
    return { data: null, error: speicherResult.error ?? "Nachricht konnte nicht gespeichert werden" };
  }

  const nachricht = speicherResult.data;

  // 5. Nachrichtentyp-spezifische Verarbeitung
  if (nachrichtentyp === "0200") {
    return await verarbeite0200(serviceClient, tenantId, userId, nachricht, parsed, bezug);
  }

  // 6. Folgenachricht: automatische Zuordnung
  if (nachrichtentyp === "1100") {
    // Rückweisungen werden nur gespeichert, nie mit 1100 quittiert (Kettenverbot)
    await updateNachrichtStatus(serviceClient, tenantId, nachricht.id, "verarbeitet");
    return {
      data: {
        nachrichtId: nachricht.id,
        nachrichtentyp,
        status: "verarbeitet",
      },
      error: null,
    };
  }

  // Alle anderen Nachrichten: bezug-Korrelation
  return await verarbeiteFolgenachricht(serviceClient, tenantId, nachricht, bezug);
}

async function verarbeite0200(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
  nachricht: XBauNachricht,
  parsed: Record<string, unknown>,
  bezug: XBauBezug
): Promise<{ data: EmpfangeNachrichtErgebnis | null; error: string | null }> {
  const parsed0200 = parse0200(parsed);
  if (!parsed0200) {
    await updateNachrichtStatus(serviceClient, tenantId, nachricht.id, "abgewiesen");
    return {
      data: {
        nachrichtId: nachricht.id,
        nachrichtentyp: "0200",
        status: "abgewiesen",
        fehler: "0200-Nachricht konnte nicht geparst werden (Pflichtfelder fehlen)",
      },
      error: null,
    };
  }

  // Verfahrensart-Mapping über xbau_code
  let verfahrensartId: string | undefined;
  if (parsed0200.verfahrensartCode) {
    const { data: vaData } = await serviceClient
      .from("config_verfahrensarten")
      .select("id")
      .eq("xbau_code", parsed0200.verfahrensartCode)
      .eq("aktiv", true)
      .limit(1);

    if (vaData && vaData.length > 0) {
      verfahrensartId = vaData[0].id;
    }
  }

  // Fallback: Erste aktive Verfahrensart des Tenants
  if (!verfahrensartId) {
    const { data: tenant } = await serviceClient
      .from("tenants")
      .select("bundesland")
      .eq("id", tenantId)
      .single();

    if (tenant?.bundesland) {
      const { data: fallbackVa } = await serviceClient
        .from("config_verfahrensarten")
        .select("id")
        .eq("bundesland", tenant.bundesland)
        .eq("aktiv", true)
        .order("sortierung", { ascending: true })
        .limit(1);

      if (fallbackVa && fallbackVa.length > 0) {
        verfahrensartId = fallbackVa[0].id;
      }
    }
  }

  if (!verfahrensartId) {
    await updateNachrichtStatus(serviceClient, tenantId, nachricht.id, "abgewiesen");
    return {
      data: {
        nachrichtId: nachricht.id,
        nachrichtentyp: "0200",
        status: "abgewiesen",
        fehler: "Keine passende Verfahrensart gefunden",
      },
      error: null,
    };
  }

  // Vorgang anlegen
  const vorgangResult = await createVorgang(serviceClient, {
    tenantId,
    userId,
    verfahrensart_id: verfahrensartId,
    bauherr_name: parsed0200.bauherr.name || "Unbekannt (aus XBau-Import)",
    bauherr_anschrift: parsed0200.bauherr.anschrift,
    grundstueck_adresse: parsed0200.grundstueck.adresse,
    grundstueck_flurstueck: parsed0200.grundstueck.flurstueck,
    grundstueck_gemarkung: parsed0200.grundstueck.gemarkung,
    bezeichnung: parsed0200.bezeichnung,
  });

  if (vorgangResult.error || !vorgangResult.data) {
    await updateNachrichtStatus(serviceClient, tenantId, nachricht.id, "abgewiesen");
    return {
      data: {
        nachrichtId: nachricht.id,
        nachrichtentyp: "0200",
        status: "abgewiesen",
        fehler: "Vorgang konnte nicht angelegt werden",
      },
      error: null,
    };
  }

  // Nachricht mit Vorgang verknüpfen
  await updateNachrichtStatus(serviceClient, tenantId, nachricht.id, "verarbeitet", vorgangResult.data.id);

  // Audit-Log
  await writeAuditLog({
    tenantId,
    userId,
    action: "vorgang.created_from_xbau",
    resourceType: "vorgang",
    resourceId: vorgangResult.data.id,
    payload: {
      nachrichten_uuid: nachricht.nachrichten_uuid,
      nachricht_id: nachricht.id,
    },
  });

  return {
    data: {
      nachrichtId: nachricht.id,
      nachrichtentyp: "0200",
      status: "verarbeitet",
      vorgangId: vorgangResult.data.id,
      aktenzeichen: vorgangResult.data.aktenzeichen,
    },
    error: null,
  };
}

async function verarbeiteFolgenachricht(
  serviceClient: SupabaseClient,
  tenantId: string,
  nachricht: XBauNachricht,
  bezug: XBauBezug
): Promise<{ data: EmpfangeNachrichtErgebnis | null; error: string | null }> {
  const korrelation = await korreliereNachricht(serviceClient, tenantId, bezug);

  if (korrelation.vorgangId) {
    await updateNachrichtStatus(serviceClient, tenantId, nachricht.id, "verarbeitet", korrelation.vorgangId);
    return {
      data: {
        nachrichtId: nachricht.id,
        nachrichtentyp: nachricht.nachrichtentyp,
        status: "verarbeitet",
        vorgangId: korrelation.vorgangId,
      },
      error: null,
    };
  }

  // Kein Match oder Mehrfach-Match → Zuordnungs-Queue
  return {
    data: {
      nachrichtId: nachricht.id,
      nachrichtentyp: nachricht.nachrichtentyp,
      status: "zuordnung_ausstehend",
      fehler: korrelation.mehrfachMatch
        ? "Mehrere Vorgänge gefunden — manuelle Zuordnung erforderlich"
        : "Kein passender Vorgang gefunden — manuelle Zuordnung erforderlich",
    },
    error: null,
  };
}

/** Extrahiert UI-relevante Kerndaten aus einer geparsten Nachricht */
function extrahiereKerndaten(
  parsed: Record<string, unknown>,
  nachrichtentyp: string
): Record<string, unknown> {
  if (nachrichtentyp === "0200") {
    const p = parse0200(parsed);
    if (p) {
      return {
        bauherr_name: p.bauherr.name,
        grundstueck_adresse: p.grundstueck.adresse ?? null,
        bezeichnung: p.bezeichnung ?? null,
        verfahrensart_code: p.verfahrensartCode ?? null,
      };
    }
  }
  // Generisch: Nachrichtentyp ist die einzige Kerninformation
  return { nachrichtentyp };
}

// Re-Exports für API-Routes
export { listeNachrichtenFuerVorgang, listeFehlerNachrichten, listeUnzugeordneteNachrichten, zuordneNachricht } from "./nachricht-store";
export type { XBauNachricht, XBauNachrichtListItem } from "./types";
export { getNachrichtenLabel } from "./types";
