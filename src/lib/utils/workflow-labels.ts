/**
 * Workflow-Schritt-Labels (PROJ-3, ADR-011)
 *
 * Fallback-Labels fuer Workflow-Schritte, wenn keine Workflow-Definition
 * aus der API geladen wurde (z.B. in der Vorgangsliste).
 * In der Detailansicht werden die Labels aus der API bevorzugt
 * (workflow.alle_schritte[].label).
 */

export interface SchrittLabelInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

const FALLBACK_LABELS: Record<string, SchrittLabelInfo> = {
  eingegangen: { label: "Eingegangen", variant: "secondary" },
  vollstaendigkeitspruefung: { label: "Vollständigkeitsprüfung", variant: "default" },
  nachforderung: { label: "Nachforderung", variant: "outline" },
  beteiligung: { label: "ToEB-Beteiligung", variant: "outline" },
  pruefung: { label: "Fachliche Prüfung", variant: "default" },
  bescheid_entwurf: { label: "Bescheid erstellen", variant: "default" },
  freizeichnung: { label: "Freizeichnung", variant: "default" },
  zustellung: { label: "Zustellung", variant: "default" },
  abgeschlossen: { label: "Abgeschlossen", variant: "secondary" },
  // Zusaetzliche Labels aus dem bisherigen Frontend-Code
  formelle_pruefung: { label: "Formelle Prüfung", variant: "default" },
  materielle_pruefung: { label: "Materielle Prüfung", variant: "default" },
  stellungnahmen: { label: "Stellungnahmen", variant: "outline" },
  entscheidung: { label: "Entscheidung", variant: "default" },
  genehmigt: { label: "Genehmigt", variant: "secondary" },
  abgelehnt: { label: "Abgelehnt", variant: "destructive" },
  zurueckgestellt: { label: "Zurückgestellt", variant: "outline" },
};

/**
 * Label fuer einen Workflow-Schritt ermitteln.
 * Bevorzugt Label aus der Workflow-Definition (API), Fallback auf statische Map.
 */
export function getSchrittLabel(
  schrittId: string,
  apiLabels?: Record<string, string>
): SchrittLabelInfo {
  // 1. API-Label bevorzugen
  if (apiLabels && apiLabels[schrittId]) {
    return {
      label: apiLabels[schrittId],
      variant: FALLBACK_LABELS[schrittId]?.variant ?? "default",
    };
  }

  // 2. Fallback auf statische Map
  return FALLBACK_LABELS[schrittId] ?? { label: schrittId, variant: "outline" };
}

/** Alle bekannten Fallback-Labels (fuer Filter-Dropdowns in der Liste) */
export function getAllSchrittLabels(): Record<string, SchrittLabelInfo> {
  return { ...FALLBACK_LABELS };
}

/**
 * Kontextinformation eines Workflow-Schritts (PROJ-30).
 * Enthält Hinweistext und Checkliste für die Anzeige bei Aktions-Buttons.
 */
export interface SchrittKontextInfo {
  hinweis?: string;
  checkliste?: string[];
}

/**
 * Prüft, ob für einen Schritt Kontextinformation vorhanden ist.
 * Gibt true zurück wenn mindestens Hinweis oder nicht-leere Checkliste existiert.
 */
export function hatSchrittKontext(kontext: SchrittKontextInfo | undefined | null): boolean {
  if (!kontext) return false;
  return Boolean(kontext.hinweis) || Boolean(kontext.checkliste && kontext.checkliste.length > 0);
}
