import { z } from "zod";

/**
 * Stellvertreter-Types (ADR-013, PROJ-35)
 * Zod-Schemas und TypeScript-Interfaces fuer Freigabe-Stellvertretung.
 */

export const CreateVertretungSchema = z.object({
  stellvertreter_id: z.string().uuid("Ungültige Stellvertreter-ID"),
});

export const VertretungDbSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  vertretener_id: z.string(),
  stellvertreter_id: z.string(),
  created_at: z.string(),
});

export interface Vertretung {
  id: string;
  tenant_id: string;
  vertretener_id: string;
  stellvertreter_id: string;
  created_at: string;
}

export interface VertretungMitNamen extends Vertretung {
  vertretener_email: string;
  stellvertreter_email: string;
}
