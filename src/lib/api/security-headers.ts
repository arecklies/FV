/**
 * Security Headers (security.md)
 * Zentrale Konstante -- in jeder API-Route importieren, nicht duplizieren.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-XSS-Protection": "0",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * NextResponse mit Security Headers erstellen.
 */
export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: SECURITY_HEADERS,
  });
}
