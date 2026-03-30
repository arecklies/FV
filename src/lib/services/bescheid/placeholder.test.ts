/**
 * Unit-Tests fuer PlatzhalterEngine (PROJ-6 FA-3, FA-4)
 */

import {
  extractPlaceholders,
  resolvePlaceholders,
  resolveVorgangPlatzhalter,
  PLATZHALTER_KATALOG,
} from "./placeholder";
import type { Vorgang } from "@/lib/services/verfahren/types";

// -- extractPlaceholders --

describe("extractPlaceholders", () => {
  it("sollte Platzhalter aus einem Text extrahieren", () => {
    const text = "Sehr geehrte(r) {{antragsteller}}, Aktenzeichen: {{aktenzeichen}}";
    const result = extractPlaceholders(text);
    expect(result).toEqual(["aktenzeichen", "antragsteller"]);
  });

  it("sollte leeres Array bei Text ohne Platzhalter zurueckgeben", () => {
    const result = extractPlaceholders("Kein Platzhalter hier.");
    expect(result).toEqual([]);
  });

  it("sollte Duplikate entfernen", () => {
    const text = "{{datum}} bis {{datum}} ab {{aktenzeichen}}";
    const result = extractPlaceholders(text);
    expect(result).toEqual(["aktenzeichen", "datum"]);
  });

  it("sollte sortierte Ergebnisse liefern", () => {
    const text = "{{zzz}} {{aaa}} {{mmm}}";
    const result = extractPlaceholders(text);
    expect(result).toEqual(["aaa", "mmm", "zzz"]);
  });

  it("sollte leeren Text verarbeiten", () => {
    const result = extractPlaceholders("");
    expect(result).toEqual([]);
  });

  it("sollte unvollstaendige Platzhalter ignorieren", () => {
    const text = "{{valid}} {invalid} {{also_valid}} {{ no_spaces }}";
    const result = extractPlaceholders(text);
    expect(result).toEqual(["also_valid", "valid"]);
  });
});

// -- resolvePlaceholders --

describe("resolvePlaceholders", () => {
  it("sollte alle Platzhalter ersetzen wenn Werte vorhanden", () => {
    const text = "Bescheid fuer {{antragsteller}}, Az: {{aktenzeichen}}";
    const werte = {
      antragsteller: "Max Mustermann",
      aktenzeichen: "2026/BG-0001",
    };
    const { resolved, missing } = resolvePlaceholders(text, werte);
    expect(resolved).toBe("Bescheid fuer Max Mustermann, Az: 2026/BG-0001");
    expect(missing).toEqual([]);
  });

  it("sollte fehlende Platzhalter melden und beibehalten", () => {
    const text = "{{antragsteller}} am {{datum}} in {{stadt}}";
    const werte = { antragsteller: "Erika Musterfrau" };
    const { resolved, missing } = resolvePlaceholders(text, werte);
    expect(resolved).toBe("Erika Musterfrau am {{datum}} in {{stadt}}");
    expect(missing).toEqual(["datum", "stadt"]);
  });

  it("sollte leere Werte als fehlend behandeln", () => {
    const text = "{{antragsteller}} - {{aktenzeichen}}";
    const werte = { antragsteller: "", aktenzeichen: "2026/BG-0001" };
    const { resolved, missing } = resolvePlaceholders(text, werte);
    expect(resolved).toBe("{{antragsteller}} - 2026/BG-0001");
    expect(missing).toEqual(["antragsteller"]);
  });

  it("sollte Text ohne Platzhalter unveraendert lassen", () => {
    const text = "Kein Platzhalter.";
    const { resolved, missing } = resolvePlaceholders(text, {});
    expect(resolved).toBe("Kein Platzhalter.");
    expect(missing).toEqual([]);
  });

  it("sollte mehrfaches Vorkommen desselben Platzhalters ersetzen", () => {
    const text = "{{name}} und nochmal {{name}}";
    const werte = { name: "Test" };
    const { resolved, missing } = resolvePlaceholders(text, werte);
    expect(resolved).toBe("Test und nochmal Test");
    expect(missing).toEqual([]);
  });

  it("sollte fehlende Platzhalter sortiert und dedupliziert zurueckgeben", () => {
    const text = "{{zzz}} {{aaa}} {{zzz}}";
    const { missing } = resolvePlaceholders(text, {});
    expect(missing).toEqual(["aaa", "zzz"]);
  });
});

// -- resolveVorgangPlatzhalter --

describe("resolveVorgangPlatzhalter", () => {
  const MOCK_VORGANG: Vorgang = {
    id: "v-001",
    tenant_id: "t-001",
    aktenzeichen: "2026/BG-0142",
    verfahrensart_id: "va-001",
    bundesland: "NW",
    bauherr_name: "Max Mustermann",
    bauherr_anschrift: "Musterstraße 1",
    bauherr_telefon: null,
    bauherr_email: null,
    grundstueck_adresse: "Baustraße 5, 50667 Köln",
    grundstueck_flurstueck: "1234/5",
    grundstueck_gemarkung: "Koeln",
    bezeichnung: "Neubau Einfamilienhaus",
    workflow_schritt_id: "bescheid_entwurf",
    zustaendiger_user_id: null,
    eingangsdatum: "2026-03-15T00:00:00Z",
    created_by: null,
    created_at: "2026-03-15T00:00:00Z",
    updated_at: "2026-03-15T00:00:00Z",
    deleted_at: null,
    version: 1,
    extra_felder: {},
    geltungsdauer_bis: null,
  };

  it("sollte Platzhalter-Werte aus Vorgangsdaten extrahieren", () => {
    const werte = resolveVorgangPlatzhalter(MOCK_VORGANG, "Baugenehmigung");

    expect(werte.aktenzeichen).toBe("2026/BG-0142");
    expect(werte.antragsteller).toBe("Max Mustermann");
    expect(werte.bauvorhaben_bezeichnung).toBe("Neubau Einfamilienhaus");
    expect(werte.grundstueck_adresse).toBe("Baustraße 5, 50667 Köln");
    expect(werte.grundstueck_gemarkung).toBe("Koeln");
    expect(werte.grundstueck_flurstueck).toBe("1234/5");
    expect(werte.verfahrensart).toBe("Baugenehmigung");
    expect(werte.datum).toBeDefined(); // Aktuelles Datum
    expect(werte.antragsdatum).toBeDefined();
  });

  it("sollte optionale Felder ueberspringen wenn null", () => {
    const sparse: Vorgang = {
      ...MOCK_VORGANG,
      grundstueck_gemarkung: null,
      grundstueck_flurstueck: null,
      bezeichnung: null,
    };
    const werte = resolveVorgangPlatzhalter(sparse);
    expect(werte.grundstueck_gemarkung).toBeUndefined();
    expect(werte.grundstueck_flurstueck).toBeUndefined();
    expect(werte.bauvorhaben_bezeichnung).toBeUndefined();
    expect(werte.verfahrensart).toBeUndefined();
  });

  it("sollte Antragsdatum als deutsches Datum formatieren", () => {
    const werte = resolveVorgangPlatzhalter(MOCK_VORGANG);
    // Format: TT.MM.JJJJ
    expect(werte.antragsdatum).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

// -- PLATZHALTER_KATALOG --

describe("PLATZHALTER_KATALOG", () => {
  it("sollte die definierten Platzhalter enthalten", () => {
    expect(PLATZHALTER_KATALOG.has("aktenzeichen")).toBe(true);
    expect(PLATZHALTER_KATALOG.has("antragsteller")).toBe(true);
    expect(PLATZHALTER_KATALOG.has("datum")).toBe(true);
    expect(PLATZHALTER_KATALOG.has("behoerde_name")).toBe(true);
  });

  it("sollte Beschreibung und Beispiel fuer jeden Eintrag haben", () => {
    PLATZHALTER_KATALOG.forEach((def, key) => {
      expect(def.beschreibung).toBeTruthy();
      expect(def.beispiel).toBeTruthy();
    });
  });
});
