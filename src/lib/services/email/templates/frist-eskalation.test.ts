import { renderFristEskalation, FristEskalationData } from "./frist-eskalation";

describe("renderFristEskalation", () => {
  const baseData: FristEskalationData = {
    aktenzeichen: "BV-2026-001",
    fristTyp: "Gesamtfrist",
    restzeit: "3 Werktage",
    ampelStatus: "gelb",
    direktLink: "https://app.fachverfahren.de/vorgaenge/abc-123",
  };

  it("sollte subject, html und text zurueckgeben", () => {
    const result = renderFristEskalation(baseData);

    expect(result.subject).toBeDefined();
    expect(result.html).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("sollte Aktenzeichen im Subject enthalten bei gelb", () => {
    const result = renderFristEskalation(baseData);

    expect(result.subject).toContain("Warnung");
    expect(result.subject).toContain("BV-2026-001");
    expect(result.subject).toContain("Gesamtfrist");
  });

  it("sollte Kritisch im Subject enthalten bei rot", () => {
    const result = renderFristEskalation({ ...baseData, ampelStatus: "rot" });

    expect(result.subject).toContain("Kritisch");
    expect(result.subject).toContain("BV-2026-001");
  });

  it("sollte Fristtyp und Restzeit im HTML enthalten", () => {
    const result = renderFristEskalation(baseData);

    expect(result.html).toContain("Gesamtfrist");
    expect(result.html).toContain("3 Werktage");
    expect(result.html).toContain("BV-2026-001");
  });

  it("sollte Direktlink im HTML und Text enthalten", () => {
    const result = renderFristEskalation(baseData);

    expect(result.html).toContain("https://app.fachverfahren.de/vorgaenge/abc-123");
    expect(result.text).toContain("https://app.fachverfahren.de/vorgaenge/abc-123");
  });

  it("sollte Fristtyp und Restzeit im Plain-Text enthalten", () => {
    const result = renderFristEskalation(baseData);

    expect(result.text).toContain("Gesamtfrist");
    expect(result.text).toContain("3 Werktage");
    expect(result.text).toContain("BV-2026-001");
  });

  it("sollte 'Ohne Aktenzeichen' bei null anzeigen", () => {
    const result = renderFristEskalation({ ...baseData, aktenzeichen: null });

    expect(result.subject).toContain("Ohne Aktenzeichen");
    expect(result.html).toContain("Ohne Aktenzeichen");
    expect(result.text).toContain("Ohne Aktenzeichen");
  });

  it("sollte gelbe Farbe fuer gelb-Status verwenden", () => {
    const result = renderFristEskalation(baseData);

    expect(result.html).toContain("#f59e0b");
  });

  it("sollte rote Farbe fuer rot-Status verwenden", () => {
    const result = renderFristEskalation({ ...baseData, ampelStatus: "rot" });

    expect(result.html).toContain("#ef4444");
  });

  it("sollte keine PII enthalten (keine Personennamen, keine E-Mail-Adressen)", () => {
    const result = renderFristEskalation(baseData);

    // PII-Pruefung: Template darf keine Platzhalter fuer Personennamen haben
    expect(result.html).not.toContain("Antragsteller");
    expect(result.text).not.toContain("Antragsteller");
    expect(result.html).not.toContain("Bauherr");
    expect(result.text).not.toContain("Bauherr");
  });

  it("sollte valides HTML mit DOCTYPE zurueckgeben", () => {
    const result = renderFristEskalation(baseData);

    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain('lang="de"');
    expect(result.html).toContain('charset="UTF-8"');
  });

  it("sollte UTF-8 Umlaute korrekt rendern", () => {
    const result = renderFristEskalation(baseData);

    // Deutsche Umlaute muessen direkt enthalten sein (nicht als Entities)
    expect(result.text).toContain("öffnen");
    expect(result.text).toContain("können");
    expect(result.text).toContain("persönlichen");
  });
});
