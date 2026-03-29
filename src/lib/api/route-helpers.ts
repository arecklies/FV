import { NextRequest } from "next/server";
import { z } from "zod";
import { SupabaseClient } from "@supabase/supabase-js";
import { validationError, notFoundError, serverError } from "./errors";
import { UuidParamSchema } from "@/lib/services/verfahren/types";
import { getVorgang } from "@/lib/services/verfahren";
import type { Vorgang } from "@/lib/services/verfahren/types";

/**
 * PROJ-27: Route-Handler-Utilities
 *
 * Wiederverwendbare Helfer fuer wiederkehrende Patterns in API-Routes:
 * - JSON-Body mit Zod parsen
 * - UUID-Parameter validieren
 * - Vorgang laden mit Existenz- und Tenant-Pruefung
 */

// ─── parseJsonBody ───────────────────────────────────────────────────

type ParseJsonBodySuccess<T> = { data: T; error: null };
type ParseJsonBodyError = { data: null; error: Response };
type ParseJsonBodyResult<T> = ParseJsonBodySuccess<T> | ParseJsonBodyError;

/**
 * JSON-Body aus einem Request lesen und mit einem Zod-Schema validieren.
 *
 * Gibt bei Erfolg die validierten Daten zurueck.
 * Bei Zod-Fehler: 400-Response mit Felddetails.
 * Bei JSON-Parse-Fehler: 500-Response (Error-Leakage-Verbot: Details nur ins Log).
 *
 * @param request - NextRequest mit JSON-Body
 * @param schema - Zod-Schema fuer Validierung
 * @param logPrefix - Prefix fuer Server-Log bei Parse-Fehler (z.B. "[PROJ-7] POST /api/...")
 *
 * @example
 * const result = await parseJsonBody(request, MySchema, "[PROJ-7] POST /api/foo");
 * if (result.error) return result.error;
 * const body = result.data; // typisiert als z.infer<typeof MySchema>
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
  logPrefix: string
): Promise<ParseJsonBodyResult<z.infer<T>>> {
  try {
    const json = await request.json();
    const parsed = schema.parse(json);
    return { data: parsed, error: null };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      err.issues.forEach((issue) => {
        fields[issue.path.join(".")] = issue.message;
      });
      return { data: null, error: validationError(fields) };
    }
    return { data: null, error: serverError(`${logPrefix}: parse error`, err) };
  }
}

// ─── validateUuidParam ───────────────────────────────────────────────

type ValidateUuidSuccess = { id: string; error: null };
type ValidateUuidError = { id: null; error: Response };
type ValidateUuidResult = ValidateUuidSuccess | ValidateUuidError;

/**
 * UUID-Path-Parameter validieren (B-004 aus backend.md).
 *
 * @param id - Roher String aus Path-Parametern
 * @param fieldName - Feldname fuer die Fehlermeldung (z.B. "Vorgang-ID", "Nachrichten-ID")
 *
 * @example
 * const uuidResult = validateUuidParam(id, "Vorgang-ID");
 * if (uuidResult.error) return uuidResult.error;
 * const validId = uuidResult.id;
 */
export function validateUuidParam(
  id: string,
  fieldName = "ID"
): ValidateUuidResult {
  const result = UuidParamSchema.safeParse(id);
  if (!result.success) {
    return { id: null, error: validationError({ id: `Ungültige ${fieldName}` }) };
  }
  return { id: result.data, error: null };
}

// ─── validateVorgangAccess ───────────────────────────────────────────

type VorgangAccessSuccess = { vorgang: Vorgang; error: null };
type VorgangAccessError = { vorgang: null; error: Response };
type VorgangAccessResult = VorgangAccessSuccess | VorgangAccessError;

/**
 * Vorgang laden mit UUID-Validierung, Existenz- und Tenant-Pruefung.
 *
 * Kombiniert:
 * 1. UUID-Validierung des Path-Parameters
 * 2. getVorgang() mit tenant_id-Filter
 * 3. 404-Response wenn nicht gefunden
 *
 * @param serviceClient - Supabase Service-Role-Client
 * @param tenantId - Tenant-ID des authentifizierten Users
 * @param vorgangId - Roher String aus Path-Parametern (wird UUID-validiert)
 *
 * @example
 * const result = await validateVorgangAccess(serviceClient, auth.tenantId, id);
 * if (result.error) return result.error;
 * const vorgang = result.vorgang;
 */
export async function validateVorgangAccess(
  serviceClient: SupabaseClient,
  tenantId: string,
  vorgangId: string
): Promise<VorgangAccessResult> {
  const uuidResult = validateUuidParam(vorgangId, "Vorgang-ID");
  if (uuidResult.error) {
    return { vorgang: null, error: uuidResult.error };
  }

  const vorgangResult = await getVorgang(serviceClient, tenantId, uuidResult.id);
  if (vorgangResult.error || !vorgangResult.data) {
    return { vorgang: null, error: notFoundError("Vorgang nicht gefunden") };
  }

  return { vorgang: vorgangResult.data, error: null };
}
