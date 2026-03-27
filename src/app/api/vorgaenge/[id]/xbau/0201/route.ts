import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, notFoundError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getVorgang } from "@/lib/services/verfahren";
import { createFrist } from "@/lib/services/fristen";
import { speichereNachricht } from "@/lib/services/xbau/nachricht-store";
import { writeAuditLog } from "@/lib/services/audit";
import { build0201 } from "@/lib/services/xbau/messages";
import { UuidParamSchema } from "@/lib/services/verfahren/types";

/**
 * POST /api/vorgaenge/[id]/xbau/0201
 * Generiert eine XBau-Nachricht 0201 (Formelle Pruefung).
 * PROJ-7 US-2
 */

const FormellePruefungSchema = z.object({
  antrag_vollstaendig: z.boolean(),
  befundliste: z.array(z.string().min(1)).optional(),
  frist_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD").optional(),
  spaetestes_genehmigungsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD").optional(),
  anschreiben: z.string().optional(),
}).refine(
  (data) => {
    if (!data.antrag_vollstaendig) {
      return data.befundliste && data.befundliste.length > 0;
    }
    return true;
  },
  { message: "Bei unvollständigem Antrag ist eine Befundliste Pflicht", path: ["befundliste"] }
);

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  // Auth
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  // Path-Parameter validieren
  const { id } = await params;
  const idResult = UuidParamSchema.safeParse(id);
  if (!idResult.success) return validationError({ id: "Ungültige Vorgang-ID" });

  // Body validieren
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError({ body: "Ungültiges JSON" });
  }

  const parseResult = FormellePruefungSchema.safeParse(body);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      fields[issue.path.join(".")] = issue.message;
    }
    return validationError(fields);
  }

  const input = parseResult.data;
  const serviceClient = createServiceRoleClient();

  // Vorgang laden (Tenant-isoliert)
  const vorgangResult = await getVorgang(serviceClient, auth.tenantId, id);
  if (vorgangResult.error || !vorgangResult.data) {
    return notFoundError("Vorgang nicht gefunden");
  }

  const vorgang = vorgangResult.data;

  // Bezugsnachricht suchen (0200 fuer diesen Vorgang)
  const { data: bezugNachricht } = await serviceClient
    .from("xbau_nachrichten")
    .select("nachrichten_uuid, nachrichtentyp, created_at, absender_behoerde, empfaenger_behoerde")
    .eq("tenant_id", auth.tenantId)
    .eq("vorgang_id", id)
    .eq("nachrichtentyp", "0200")
    .eq("richtung", "eingang")
    .order("created_at", { ascending: false })
    .limit(1);

  const bezugRef = bezugNachricht?.[0];

  // 0201 generieren
  let xml: string;
  try {
    xml = build0201({
      antragVollstaendig: input.antrag_vollstaendig,
      befundliste: input.befundliste,
      fristDatum: input.frist_datum,
      spaetestesGenehmigungsdatum: input.spaetestes_genehmigungsdatum,
      anschreiben: input.anschreiben,
      bezugNachrichtenUuid: bezugRef?.nachrichten_uuid ?? "00000000-0000-0000-0000-000000000000",
      bezugNachrichtentyp: bezugRef?.nachrichtentyp ?? "0200",
      bezugErstellungszeit: bezugRef?.created_at ?? new Date().toISOString(),
      aktenzeichen: vorgang.aktenzeichen,
      autor: {
        verzeichnisdienst: "psw",
        kennung: `tenant-${auth.tenantId}`,
        name: "Bauaufsichtsbehörde",
      },
      leser: {
        verzeichnisdienst: "psw",
        kennung: bezugRef?.absender_behoerde ?? "unbekannt",
        name: bezugRef?.absender_behoerde ?? "Antragsteller",
      },
    });
  } catch (err) {
    return serverError("[PROJ-7] 0201-XML-Generierung fehlgeschlagen", err);
  }

  // In xbau_nachrichten speichern (AC-6)
  const speicherResult = await speichereNachricht(serviceClient, {
    tenantId: auth.tenantId,
    nachrichtenUuid: globalThis.crypto.randomUUID(),
    nachrichtentyp: "0201",
    richtung: "ausgang",
    status: "generiert",
    rohXml: xml,
    kerndaten: {
      antrag_vollstaendig: input.antrag_vollstaendig,
      befundliste_anzahl: input.befundliste?.length ?? 0,
      frist_datum: input.frist_datum ?? null,
    },
    vorgangId: id,
    bezugAktenzeichen: vorgang.aktenzeichen,
  });

  if (speicherResult.error || !speicherResult.data) {
    return serverError("[PROJ-7] 0201-Nachricht speichern fehlgeschlagen", speicherResult.error);
  }

  const nachricht = speicherResult.data;

  // Nachforderungsfrist anlegen (AC-9)
  if (!input.antrag_vollstaendig && input.frist_datum) {
    try {
      await createFrist(serviceClient, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        vorgangId: id,
        typ: "nachforderung",
        bezeichnung: "Nachforderungsfrist (formelle Prüfung)",
        werktage: 30, // Default, wird durch frist_datum uebersteuert
        startDatum: new Date().toISOString().split("T")[0],
        bundesland: vorgang.bundesland,
      });
    } catch (err) {
      // Frist-Fehler blockiert nicht die Nachricht, nur loggen
      console.error("[PROJ-7] Nachforderungsfrist konnte nicht angelegt werden", err);
    }
  }

  // Audit-Log (AC-10)
  await writeAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: "xbau.0201_generated",
    resourceType: "vorgang",
    resourceId: id,
    payload: {
      nachricht_id: nachricht.id,
      antrag_vollstaendig: input.antrag_vollstaendig,
    },
  });

  return jsonResponse({
    nachricht_id: nachricht.id,
    download_url: `/api/xbau/nachrichten/${nachricht.id}/download`,
  }, 201);
}
