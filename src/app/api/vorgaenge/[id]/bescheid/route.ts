import { NextRequest } from "next/server";
import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { conflictError, serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { validateVorgangAccess, parseJsonBody } from "@/lib/api/route-helpers";
import {
  createBescheidEntwurf,
  getBescheidEntwurf,
  updateBausteine,
  updateNebenbestimmungen,
} from "@/lib/services/bescheid";
import {
  CreateBescheidSchema,
  UpdateBausteinListeSchema,
  UpdateNebenbestimmungenSchema,
} from "@/lib/services/bescheid/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/vorgaenge/[id]/bescheid
 * Aktuellen Bescheid-Entwurf eines Vorgangs laden.
 * PROJ-6 US-1
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const result = await getBescheidEntwurf(serviceClient, auth.tenantId, id);
  if (result.error) {
    return serverError("[PROJ-6] GET /api/vorgaenge/[id]/bescheid", result.error);
  }

  return jsonResponse({ bescheid: result.data });
}

/**
 * POST /api/vorgaenge/[id]/bescheid
 * Neuen Bescheid-Entwurf erstellen.
 * PROJ-6 US-1 AC-1, AC-2
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  const body = await parseJsonBody(request, CreateBescheidSchema, "[PROJ-6] POST /api/vorgaenge/[id]/bescheid");
  if (body.error) return body.error;

  const result = await createBescheidEntwurf(
    serviceClient,
    auth.tenantId,
    auth.userId,
    id,
    body.data.bescheidtyp
  );

  if (result.error) {
    return serverError("[PROJ-6] POST /api/vorgaenge/[id]/bescheid", result.error);
  }

  return jsonResponse({ bescheid: result.data }, 201);
}

/**
 * PUT /api/vorgaenge/[id]/bescheid
 * Bausteine oder Nebenbestimmungen aktualisieren (Optimistic Locking).
 * Body muss entweder "bausteine" oder "nebenbestimmungen" enthalten.
 * PROJ-6 US-1 AC-4, AC-6
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const serviceClient = createServiceRoleClient();

  const vorgangResult = await validateVorgangAccess(serviceClient, auth.tenantId, id);
  if (vorgangResult.error) return vorgangResult.error;

  // Bescheid-ID ermitteln
  const bescheidResult = await getBescheidEntwurf(serviceClient, auth.tenantId, id);
  if (bescheidResult.error || !bescheidResult.data) {
    return serverError("[PROJ-6] PUT bescheid: kein Entwurf gefunden", bescheidResult.error);
  }

  const bescheidId = bescheidResult.data.id;

  // Body lesen (roh, damit wir entscheiden koennen welches Schema)
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return serverError("[PROJ-6] PUT bescheid: JSON-Parse-Fehler");
  }

  // Entscheiden: Bausteine oder Nebenbestimmungen?
  const raw = json as Record<string, unknown>;
  if ("bausteine" in raw) {
    const parsed = UpdateBausteinListeSchema.safeParse(json);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return jsonResponse({ error: "Ungültige Eingabe", fields }, 400);
    }

    const result = await updateBausteine(
      serviceClient,
      auth.tenantId,
      bescheidId,
      parsed.data.bausteine,
      parsed.data.version
    );

    if (result.error === "CONFLICT") {
      return conflictError("Der Bescheid wurde zwischenzeitlich geändert. Bitte laden Sie die Seite neu.");
    }
    if (result.error) {
      return serverError("[PROJ-6] PUT bescheid bausteine", result.error);
    }
    return jsonResponse({ bescheid: result.data });
  }

  if ("nebenbestimmungen" in raw) {
    const parsed = UpdateNebenbestimmungenSchema.safeParse(json);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return jsonResponse({ error: "Ungültige Eingabe", fields }, 400);
    }

    const result = await updateNebenbestimmungen(
      serviceClient,
      auth.tenantId,
      bescheidId,
      parsed.data.nebenbestimmungen,
      parsed.data.version
    );

    if (result.error === "CONFLICT") {
      return conflictError("Der Bescheid wurde zwischenzeitlich geändert. Bitte laden Sie die Seite neu.");
    }
    if (result.error) {
      return serverError("[PROJ-6] PUT bescheid nebenbestimmungen", result.error);
    }
    return jsonResponse({ bescheid: result.data });
  }

  return jsonResponse(
    { error: "Ungültige Eingabe", fields: { body: "Body muss 'bausteine' oder 'nebenbestimmungen' enthalten" } },
    400
  );
}
