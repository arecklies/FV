import { requireAuth, isAuthContext } from "@/lib/api/auth";
import { jsonResponse } from "@/lib/api/security-headers";
import { serverError } from "@/lib/api/errors";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  ladeMeineFristen,
  ladeMeineAufgaben,
  ladeKuerzlichBearbeitet,
} from "@/lib/services/tagesansicht";

/**
 * GET /api/mein-tag
 * Persoenliche Tagesansicht: Fristen, Aufgaben, kuerzlich bearbeitet.
 * PROJ-29 US-1
 */
export async function GET() {
  const auth = await requireAuth();
  if (!isAuthContext(auth)) return auth;

  const serviceClient = createServiceRoleClient();

  // Alle 3 Queries parallel ausfuehren (NFR-1: < 2s)
  const [fristenResult, aufgabenResult, kuerzlichResult] = await Promise.all([
    ladeMeineFristen(serviceClient, auth.tenantId, auth.userId),
    ladeMeineAufgaben(serviceClient, auth.tenantId, auth.userId),
    ladeKuerzlichBearbeitet(serviceClient, auth.tenantId, auth.userId),
  ]);

  // Fehler loggen, aber partielle Ergebnisse zurueckgeben
  if (fristenResult.error) {
    console.error("[PROJ-29] ladeMeineFristen failed:", fristenResult.error);
  }
  if (aufgabenResult.error) {
    console.error("[PROJ-29] ladeMeineAufgaben failed:", aufgabenResult.error);
  }
  if (kuerzlichResult.error) {
    console.error("[PROJ-29] ladeKuerzlichBearbeitet failed:", kuerzlichResult.error);
  }

  // Wenn alle 3 fehlgeschlagen sind: Server-Error
  if (fristenResult.error && aufgabenResult.error && kuerzlichResult.error) {
    return serverError("[PROJ-29] Alle Tagesansicht-Queries fehlgeschlagen");
  }

  return jsonResponse({
    fristen: fristenResult.data,
    aufgaben: aufgabenResult.data,
    kuerzlich_bearbeitet: kuerzlichResult.data,
  });
}
