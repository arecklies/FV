import { z } from "zod";

/**
 * PROJ-39: Wizard-Step-Schemas für Vorgangsanlage.
 *
 * Abgeleitet aus CreateVorgangSchema (verfahren/types.ts).
 * Jeder Schritt validiert nur seine eigenen Felder.
 */

export const Step1Schema = z.object({
  verfahrensart_id: z.string().uuid("Bitte Verfahrensart wählen"),
});

export const Step2Schema = z.object({
  bauherr_name: z.string().min(1, "Bauherr (Name) ist Pflichtfeld"),
  bauherr_anschrift: z.string().optional().default(""),
  bauherr_telefon: z.string().optional().default(""),
  bauherr_email: z
    .string()
    .email("Ungültige E-Mail-Adresse")
    .optional()
    .or(z.literal("")),
  grundstueck_adresse: z.string().optional().default(""),
  grundstueck_flurstueck: z.string().optional().default(""),
  grundstueck_gemarkung: z.string().optional().default(""),
  bezeichnung: z.string().optional().default(""),
}).refine(
  (d) => (d.grundstueck_adresse && d.grundstueck_adresse.trim()) || (d.grundstueck_flurstueck && d.grundstueck_flurstueck.trim()),
  { message: "Mindestens Adresse oder Flurstück ist Pflicht", path: ["grundstueck_adresse"] }
);

/** Wizard-Schritt-Konfiguration */
export interface WizardStep {
  id: number;
  label: string;
  shortLabel: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: "Verfahrensart wählen", shortLabel: "Verfahren" },
  { id: 2, label: "Antragsteller und Grundstück", shortLabel: "Details" },
  { id: 3, label: "Zusammenfassung prüfen", shortLabel: "Zusammenfassung" },
];

/** Validiert den aktuellen Schritt und gibt Fehler zurück */
export function validateStep(
  step: number,
  data: Record<string, string>
): Record<string, string> | null {
  const schema = step === 1 ? Step1Schema : step === 2 ? Step2Schema : null;
  if (!schema) return null;

  const result = schema.safeParse(data);
  if (result.success) return null;

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    errors[issue.path.join(".")] = issue.message;
  });
  return errors;
}

/** localStorage-Key und TTL */
export const WIZARD_STORAGE_KEY = "vorgang_neu_autosave";
export const WIZARD_STORAGE_TTL_DAYS = 7;

export interface WizardSaveState {
  modus: "wizard" | "schnell";
  currentStep: number;
  data: Record<string, string>;
  savedAt: string;
}

export function loadWizardState(): WizardSaveState | null {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as WizardSaveState;
    // TTL-Check
    const savedDate = new Date(state.savedAt);
    const now = new Date();
    const diffDays = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > WIZARD_STORAGE_TTL_DAYS) {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function saveWizardState(state: WizardSaveState): void {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage voll oder nicht verfügbar — ignorieren
  }
}

export function clearWizardState(): void {
  localStorage.removeItem(WIZARD_STORAGE_KEY);
}
