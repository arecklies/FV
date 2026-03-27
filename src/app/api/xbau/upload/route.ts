import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { validationError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { empfangeNachricht } from "@/lib/services/xbau";

/**
 * POST /api/xbau/upload
 * XBau-Nachricht empfangen und verarbeiten.
 * PROJ-7 US-1, US-1a, US-1b
 *
 * Erwartet: multipart/form-data mit Feld "datei" (XML-Datei, max 10 MB)
 * oder application/xml Body.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  let xmlContent: string;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Datei-Upload via FormData
      const formData = await request.formData();
      const datei = formData.get("datei");

      if (!datei || !(datei instanceof File)) {
        return validationError({ datei: "XML-Datei ist Pflichtfeld" });
      }

      if (datei.size > MAX_FILE_SIZE) {
        return validationError({ datei: "Datei darf maximal 10 MB groß sein" });
      }

      if (!datei.name.endsWith(".xml")) {
        return validationError({ datei: "Nur XML-Dateien (.xml) werden akzeptiert" });
      }

      xmlContent = await datei.text();
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      // Direkter XML-Body
      xmlContent = await request.text();
      if (xmlContent.length > MAX_FILE_SIZE) {
        return validationError({ body: "XML darf maximal 10 MB groß sein" });
      }
    } else {
      return validationError({ content_type: "Erwartet multipart/form-data oder application/xml" });
    }

    // Grundprüfung: Leerer Content oder kein XML
    if (!xmlContent.trim()) {
      return validationError({ datei: "Leere Datei" });
    }

    if (!xmlContent.trim().startsWith("<?xml") && !xmlContent.trim().startsWith("<")) {
      return validationError({ datei: "Datei enthält kein gültiges XML" });
    }
  } catch {
    return validationError({ datei: "Datei konnte nicht gelesen werden" });
  }

  const serviceClient = createServiceRoleClient();

  const result = await empfangeNachricht(
    serviceClient,
    auth.tenantId,
    auth.userId,
    xmlContent
  );

  if (result.error) {
    return serverError("[PROJ-7] POST /api/xbau/upload failed", result.error);
  }

  const data = result.data!;
  const httpStatus = data.status === "abgewiesen" ? 422 : 200;

  return jsonResponse({
    nachricht_id: data.nachrichtId,
    nachrichtentyp: data.nachrichtentyp,
    status: data.status,
    vorgang_id: data.vorgangId ?? null,
    aktenzeichen: data.aktenzeichen ?? null,
    fehler: data.fehler ?? null,
  }, httpStatus);
}
