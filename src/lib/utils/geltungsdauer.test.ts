/**
 * Unit-Tests für Geltungsdauer-Utility (PROJ-48)
 */

import { berechneGeltungsdauerStatus, getGeltungsdauerClassName } from "./geltungsdauer";

describe("berechneGeltungsdauerStatus", () => {
  it("sollte 'gruen' zurückgeben wenn > 6 Monate verbleiben", () => {
    const inEinemJahr = new Date();
    inEinemJahr.setFullYear(inEinemJahr.getFullYear() + 1);

    const result = berechneGeltungsdauerStatus(inEinemJahr.toISOString());
    expect(result.status).toBe("gruen");
    expect(result.label).toBe("Gültig");
    expect(result.tageVerbleibend).toBeGreaterThan(180);
  });

  it("sollte 'gelb' zurückgeben wenn < 6 Monate aber > 3 Monate", () => {
    const in4Monaten = new Date();
    in4Monaten.setDate(in4Monaten.getDate() + 120);

    const result = berechneGeltungsdauerStatus(in4Monaten.toISOString());
    expect(result.status).toBe("gelb");
    expect(result.label).toBe("Läuft bald ab");
  });

  it("sollte 'rot' zurückgeben wenn < 3 Monate", () => {
    const in2Monaten = new Date();
    in2Monaten.setDate(in2Monaten.getDate() + 60);

    const result = berechneGeltungsdauerStatus(in2Monaten.toISOString());
    expect(result.status).toBe("rot");
    expect(result.label).toBe("Ablauf kritisch");
  });

  it("sollte 'erloschen' zurückgeben wenn abgelaufen", () => {
    const gestern = new Date();
    gestern.setDate(gestern.getDate() - 1);

    const result = berechneGeltungsdauerStatus(gestern.toISOString());
    expect(result.status).toBe("erloschen");
    expect(result.label).toBe("Erloschen");
    expect(result.tageVerbleibend).toBe(0);
  });

  it("sollte Ablaufdatum als deutsches Datum formatieren", () => {
    const datum = new Date("2029-06-15T00:00:00.000Z");
    const result = berechneGeltungsdauerStatus(datum.toISOString());
    expect(result.ablaufdatum).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
  });
});

describe("getGeltungsdauerClassName", () => {
  it("sollte CSS-Klassen für alle Status zurückgeben", () => {
    expect(getGeltungsdauerClassName("gruen")).toContain("green");
    expect(getGeltungsdauerClassName("gelb")).toContain("yellow");
    expect(getGeltungsdauerClassName("rot")).toContain("red-100");
    expect(getGeltungsdauerClassName("erloschen")).toContain("red-200");
  });
});
