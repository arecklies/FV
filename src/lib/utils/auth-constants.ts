/**
 * Auth-bezogene Konstanten und Hilfsfunktionen.
 * Fachliche Rollen-Labels und Konfiguration (PROJ-1, ADR-002).
 */

/** Zuweisbare Rollen im Tenant-Admin-UI (ohne platform_admin, siehe US-3 AC-4) */
export const TENANT_ROLES = [
  "sachbearbeiter",
  "referatsleiter",
  "amtsleiter",
  "tenant_admin",
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

/** Menschenlesbare Labels fuer Rollen (DE) */
export const ROLE_LABELS: Record<string, string> = {
  sachbearbeiter: "Sachbearbeiter",
  referatsleiter: "Referatsleiter",
  amtsleiter: "Amtsleiter",
  tenant_admin: "Tenant-Admin",
  platform_admin: "Plattform-Admin",
};

/** Badge-Variante je Rolle fuer visuelle Unterscheidung */
export const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sachbearbeiter: "secondary",
  referatsleiter: "default",
  amtsleiter: "default",
  tenant_admin: "destructive",
  platform_admin: "destructive",
};
