import {
  formatiereGroesse,
  formatiereDatum,
  KATEGORIE_LABELS,
  istMimeTypeErlaubt,
  mimeTypeAusDateiname,
  erlaubteEndungenAlsAccept,
} from "./dokument-format";

describe("formatiereGroesse", () => {
  it("sollte 0 B fuer 0 Bytes zurueckgeben", () => {
    expect(formatiereGroesse(0)).toBe("0 B");
  });

  it("sollte negative Werte als 0 B behandeln", () => {
    expect(formatiereGroesse(-100)).toBe("0 B");
  });

  it("sollte Bytes korrekt formatieren", () => {
    expect(formatiereGroesse(500)).toBe("500 B");
  });

  it("sollte KB korrekt formatieren", () => {
    expect(formatiereGroesse(1024)).toBe("1.0 KB");
    expect(formatiereGroesse(1536)).toBe("1.5 KB");
  });

  it("sollte MB korrekt formatieren", () => {
    expect(formatiereGroesse(1024 * 1024)).toBe("1.0 MB");
    expect(formatiereGroesse(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });

  it("sollte GB korrekt formatieren", () => {
    expect(formatiereGroesse(1024 * 1024 * 1024)).toBe("1.0 GB");
  });
});

describe("formatiereDatum", () => {
  it("sollte ein ISO-Datum im deutschen Format formatieren", () => {
    const result = formatiereDatum("2026-03-29T10:30:00Z");
    // Pruefe auf deutsches Datumsformat (TT.MM.JJJJ)
    expect(result).toMatch(/29\.03\.2026/);
  });

  it("sollte bei ungueltigem Datum den Original-String zurueckgeben", () => {
    expect(formatiereDatum("kein-datum")).toBe("kein-datum");
  });
});

describe("KATEGORIE_LABELS", () => {
  it("sollte alle 6 Kategorien abdecken", () => {
    expect(Object.keys(KATEGORIE_LABELS)).toHaveLength(6);
    expect(KATEGORIE_LABELS.plaene).toBe("Pläne");
    expect(KATEGORIE_LABELS.sonstiges).toBe("Sonstiges");
  });
});

describe("istMimeTypeErlaubt", () => {
  it("sollte PDF als erlaubt erkennen", () => {
    expect(istMimeTypeErlaubt("application/pdf")).toBe(true);
  });

  it("sollte unbekannte MIME-Types ablehnen", () => {
    expect(istMimeTypeErlaubt("application/zip")).toBe(false);
  });
});

describe("mimeTypeAusDateiname", () => {
  it("sollte MIME-Type aus Dateinamen erkennen", () => {
    expect(mimeTypeAusDateiname("plan.pdf")).toBe("application/pdf");
    expect(mimeTypeAusDateiname("foto.jpeg")).toBe("image/jpeg");
    expect(mimeTypeAusDateiname("zeichnung.dwg")).toBe("application/acad");
  });

  it("sollte null fuer unbekannte Endungen zurueckgeben", () => {
    expect(mimeTypeAusDateiname("datei.zip")).toBeNull();
    expect(mimeTypeAusDateiname("kein-extension")).toBeNull();
  });
});

describe("erlaubteEndungenAlsAccept", () => {
  it("sollte einen kommaseparierten String mit Punkten zurueckgeben", () => {
    const result = erlaubteEndungenAlsAccept();
    expect(result).toContain(".pdf");
    expect(result).toContain(".docx");
    expect(result).toContain(".dwg");
  });
});
