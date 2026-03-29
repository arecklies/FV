import {
  getSchrittLabel,
  getAllSchrittLabels,
  hatSchrittKontext,
  SchrittKontextInfo,
} from "./workflow-labels";

describe("getSchrittLabel", () => {
  it("gibt Fallback-Label zurück wenn kein API-Label vorhanden", () => {
    const result = getSchrittLabel("eingegangen");
    expect(result.label).toBe("Eingegangen");
    expect(result.variant).toBe("secondary");
  });

  it("bevorzugt API-Label über Fallback", () => {
    const apiLabels = { eingegangen: "Antrag eingegangen" };
    const result = getSchrittLabel("eingegangen", apiLabels);
    expect(result.label).toBe("Antrag eingegangen");
    expect(result.variant).toBe("secondary"); // Variant bleibt aus Fallback
  });

  it("gibt Schritt-ID als Label zurück wenn nicht in Fallback und kein API-Label", () => {
    const result = getSchrittLabel("unbekannter_schritt");
    expect(result.label).toBe("unbekannter_schritt");
    expect(result.variant).toBe("outline");
  });

  it("verwendet API-Label mit Default-Variant wenn Schritt nicht in Fallback", () => {
    const apiLabels = { custom_step: "Benutzerdefiniert" };
    const result = getSchrittLabel("custom_step", apiLabels);
    expect(result.label).toBe("Benutzerdefiniert");
    expect(result.variant).toBe("default");
  });
});

describe("getAllSchrittLabels", () => {
  it("gibt alle bekannten Fallback-Labels zurück", () => {
    const labels = getAllSchrittLabels();
    expect(labels).toHaveProperty("eingegangen");
    expect(labels).toHaveProperty("pruefung");
    expect(labels).toHaveProperty("abgeschlossen");
  });

  it("gibt eine Kopie zurück (keine Mutation)", () => {
    const a = getAllSchrittLabels();
    const b = getAllSchrittLabels();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("hatSchrittKontext", () => {
  it("gibt false zurück bei undefined", () => {
    expect(hatSchrittKontext(undefined)).toBe(false);
  });

  it("gibt false zurück bei null", () => {
    expect(hatSchrittKontext(null)).toBe(false);
  });

  it("gibt false zurück bei leerem Objekt", () => {
    expect(hatSchrittKontext({})).toBe(false);
  });

  it("gibt false zurück bei leerer Checkliste und keinem Hinweis", () => {
    expect(hatSchrittKontext({ checkliste: [] })).toBe(false);
  });

  it("gibt true zurück wenn Hinweis vorhanden", () => {
    const kontext: SchrittKontextInfo = {
      hinweis: "Bitte Vollständigkeit prüfen",
    };
    expect(hatSchrittKontext(kontext)).toBe(true);
  });

  it("gibt true zurück wenn Checkliste nicht leer", () => {
    const kontext: SchrittKontextInfo = {
      checkliste: ["Punkt 1", "Punkt 2"],
    };
    expect(hatSchrittKontext(kontext)).toBe(true);
  });

  it("gibt true zurück wenn beides vorhanden", () => {
    const kontext: SchrittKontextInfo = {
      hinweis: "Hinweis",
      checkliste: ["Punkt 1"],
    };
    expect(hatSchrittKontext(kontext)).toBe(true);
  });

  it("gibt false zurück bei leerem Hinweis-String", () => {
    expect(hatSchrittKontext({ hinweis: "" })).toBe(false);
  });
});
