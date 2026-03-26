/**
 * Aktenzeichen-Generierung (ADR-012)
 *
 * Schema ist pro Tenant konfigurierbar (tenants.settings.aktenzeichen_schema).
 * Default: {jahr}/{laufnummer}/{kuerzel}
 * Beispiel: 2026/0142/BG
 *
 * Race-Condition-Schutz: UNIQUE(tenant_id, aktenzeichen) + Retry bei Conflict.
 */

const DEFAULT_SCHEMA = "{jahr}/{laufnummer}/{kuerzel}";

export function generateAktenzeichen(
  schema: string | undefined,
  jahr: number,
  laufnummer: number,
  verfahrenskuerzel: string
): string {
  const tpl = schema || DEFAULT_SCHEMA;
  return tpl
    .replace("{jahr}", String(jahr))
    .replace("{laufnummer}", String(laufnummer).padStart(4, "0"))
    .replace("{kuerzel}", verfahrenskuerzel);
}
