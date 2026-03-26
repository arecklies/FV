import { jsonResponse } from "./security-headers";

/**
 * Error-Response-Helfer (security.md: Error-Leakage-Verbot).
 * Generische Meldungen an Client, Details nur ins Server-Log.
 */

export function validationError(fields: Record<string, string>) {
  return jsonResponse(
    { error: "Ungültige Eingabe", fields },
    400
  );
}

export function unauthorizedError(message = "Nicht authentifiziert") {
  return jsonResponse({ error: message }, 401);
}

export function forbiddenError(message = "Nicht autorisiert") {
  return jsonResponse({ error: message }, 403);
}

export function notFoundError(message = "Nicht gefunden") {
  return jsonResponse({ error: message }, 404);
}

export function conflictError(message = "Konflikt") {
  return jsonResponse({ error: message }, 409);
}

export function serverError(logMessage: string, context?: unknown) {
  console.error(`[SERVER_ERROR] ${logMessage}`, context);
  return jsonResponse(
    { error: "Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." },
    500
  );
}
