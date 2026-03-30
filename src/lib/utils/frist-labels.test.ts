import { getFristTypLabel, formatDatumKurz, formatRelativeZeit } from "./frist-labels";

describe("getFristTypLabel", () => {
  it("sollte bekannte Fristtypen uebersetzen", () => {
    expect(getFristTypLabel("gesamtfrist")).toBe("Gesamtfrist");
    expect(getFristTypLabel("beteiligungsfrist")).toBe("Beteiligungsfrist");
    expect(getFristTypLabel("intern")).toBe("Interne Frist");
  });

  it("sollte unbekannte Fristtypen als Fallback zurueckgeben", () => {
    expect(getFristTypLabel("unbekannt")).toBe("unbekannt");
  });
});

describe("formatDatumKurz", () => {
  it("sollte ISO-Datum als TT.MM.JJJJ formatieren", () => {
    const result = formatDatumKurz("2026-03-15T00:00:00.000Z");
    expect(result).toMatch(/15\.03\.2026/);
  });
});

describe("formatRelativeZeit", () => {
  it("sollte 'gerade eben' fuer aktuelle Zeitstempel zurueckgeben", () => {
    const jetzt = new Date().toISOString();
    expect(formatRelativeZeit(jetzt)).toBe("gerade eben");
  });

  it("sollte 'vor X Min.' fuer kuerzliche Zeitstempel zurueckgeben", () => {
    const vor10Min = new Date(Date.now() - 10 * 60000).toISOString();
    expect(formatRelativeZeit(vor10Min)).toBe("vor 10 Min.");
  });

  it("sollte 'vor X Std.' fuer Stunden-alte Zeitstempel zurueckgeben", () => {
    const vor3Std = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeZeit(vor3Std)).toBe("vor 3 Std.");
  });

  it("sollte 'gestern' fuer gestrige Zeitstempel zurueckgeben", () => {
    const gestern = new Date(Date.now() - 1 * 86400000).toISOString();
    expect(formatRelativeZeit(gestern)).toBe("gestern");
  });

  it("sollte 'vor X Tagen' fuer mehrtaegige Zeitstempel zurueckgeben", () => {
    const vor5Tagen = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatRelativeZeit(vor5Tagen)).toBe("vor 5 Tagen");
  });

  it("sollte Datum fuer aeltere Zeitstempel zurueckgeben", () => {
    const vor30Tagen = new Date(Date.now() - 30 * 86400000).toISOString();
    const result = formatRelativeZeit(vor30Tagen);
    // Sollte im Format TT.MM.JJJJ sein
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});
