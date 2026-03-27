/**
 * Unit-Tests für Wizard-Step-Schemas (PROJ-39)
 */

// localStorage-Mock für Node-Umgebung
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

import {
  Step1Schema,
  Step2Schema,
  validateStep,
  WIZARD_STEPS,
  loadWizardState,
  saveWizardState,
  clearWizardState,
  WIZARD_STORAGE_KEY,
} from "./vorgang-wizard-schemas";

describe("Step1Schema", () => {
  it("akzeptiert gültige UUID", () => {
    const result = Step1Schema.safeParse({ verfahrensart_id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("lehnt leeren String ab", () => {
    const result = Step1Schema.safeParse({ verfahrensart_id: "" });
    expect(result.success).toBe(false);
  });

  it("lehnt ungültige UUID ab", () => {
    const result = Step1Schema.safeParse({ verfahrensart_id: "nicht-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("Step2Schema", () => {
  const validData = {
    bauherr_name: "Max Mustermann",
    grundstueck_adresse: "Musterstr. 1",
  };

  it("akzeptiert gültige Daten (Happy Path)", () => {
    const result = Step2Schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("lehnt leeren Bauherr-Namen ab", () => {
    const result = Step2Schema.safeParse({ ...validData, bauherr_name: "" });
    expect(result.success).toBe(false);
  });

  it("erfordert Adresse oder Flurstück", () => {
    const result = Step2Schema.safeParse({
      bauherr_name: "Max",
      grundstueck_adresse: "",
      grundstueck_flurstueck: "",
    });
    expect(result.success).toBe(false);
  });

  it("akzeptiert Flurstück statt Adresse", () => {
    const result = Step2Schema.safeParse({
      bauherr_name: "Max",
      grundstueck_flurstueck: "123/4",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt ungültige E-Mail ab", () => {
    const result = Step2Schema.safeParse({
      ...validData,
      bauherr_email: "nicht-email",
    });
    expect(result.success).toBe(false);
  });

  it("akzeptiert leere E-Mail", () => {
    const result = Step2Schema.safeParse({
      ...validData,
      bauherr_email: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("validateStep", () => {
  it("gibt null bei gültigem Schritt 1 zurück", () => {
    const result = validateStep(1, { verfahrensart_id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result).toBeNull();
  });

  it("gibt Fehler-Map bei ungültigem Schritt 1 zurück", () => {
    const result = validateStep(1, { verfahrensart_id: "" });
    expect(result).not.toBeNull();
    expect(result!.verfahrensart_id).toBeDefined();
  });

  it("gibt null bei Schritt 3 zurück (keine Validierung)", () => {
    const result = validateStep(3, {});
    expect(result).toBeNull();
  });
});

describe("WIZARD_STEPS", () => {
  it("hat 3 Schritte", () => {
    expect(WIZARD_STEPS).toHaveLength(3);
  });

  it("hat aufsteigende IDs", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual([1, 2, 3]);
  });
});

describe("Wizard localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("gibt null zurück wenn nichts gespeichert ist", () => {
    expect(loadWizardState()).toBeNull();
  });

  it("speichert und lädt State korrekt", () => {
    const state = {
      modus: "wizard" as const,
      currentStep: 2,
      data: { verfahrensart_id: "test-uuid", bauherr_name: "Max" },
      savedAt: new Date().toISOString(),
    };
    saveWizardState(state);
    const loaded = loadWizardState();
    expect(loaded).not.toBeNull();
    expect(loaded!.currentStep).toBe(2);
    expect(loaded!.data.bauherr_name).toBe("Max");
  });

  it("verwirft Daten älter als 7 Tage", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    const state = {
      modus: "wizard" as const,
      currentStep: 1,
      data: {},
      savedAt: oldDate.toISOString(),
    };
    saveWizardState(state);
    expect(loadWizardState()).toBeNull();
  });

  it("löscht State mit clearWizardState", () => {
    saveWizardState({
      modus: "schnell",
      currentStep: 1,
      data: {},
      savedAt: new Date().toISOString(),
    });
    clearWizardState();
    expect(localStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it("gibt null bei ungültigem JSON zurück", () => {
    localStorage.setItem(WIZARD_STORAGE_KEY, "ungueltig{{{");
    expect(loadWizardState()).toBeNull();
  });
});
