import {
  validationError,
  notFoundError,
  conflictError,
  forbiddenError,
  serverError,
} from "@/lib/api/errors";

/**
 * ServiceResult (PROJ-24, ADR-003)
 *
 * Typisiertes Error-Modell fuer alle Services. Ersetzt fragile String-basierte
 * Fehlerrueckgaben durch eine Discriminated Union mit typisierten Error-Codes.
 *
 * Usage:
 *   if (!result.ok) { return mapServiceError(result); }
 *   const data = result.data; // TypeScript weiss: T
 */

// -- Error-Codes --

export type ErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "DB_ERROR";

// -- Discriminated Union --

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };

// -- Factory-Funktionen --

export function success<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function failure(code: ErrorCode, message: string): ServiceResult<never> {
  return { ok: false, code, message };
}

// -- HTTP-Response-Mapping --

/**
 * Mappt ein fehlgeschlagenes ServiceResult auf eine HTTP-Response.
 * Nutzt die bestehenden Helfer aus src/lib/api/errors.ts.
 *
 * NOT_FOUND       -> 404
 * CONFLICT        -> 409
 * VALIDATION_ERROR -> 400
 * FORBIDDEN       -> 403
 * DB_ERROR        -> 500
 */
export function mapServiceError(result: { ok: false; code: ErrorCode; message: string }): Response {
  switch (result.code) {
    case "NOT_FOUND":
      return notFoundError(result.message);
    case "CONFLICT":
      return conflictError(result.message);
    case "VALIDATION_ERROR":
      return validationError({ _error: result.message });
    case "FORBIDDEN":
      return forbiddenError(result.message);
    case "DB_ERROR":
      return serverError(result.message);
  }
}
