/**
 * Tests fuer Glossar-Daten (PROJ-54)
 */
import { GLOSSAR_EINTRAEGE, GLOSSAR_MAP, sucheGlossar } from "./glossar-data";

describe("GLOSSAR_EINTRAEGE", () => {
  it("enthaelt mindestens 30 Eintraege (AC-2.6)", () => {
    expect(GLOSSAR_EINTRAEGE.length).toBeGreaterThanOrEqual(30);
  });

  it("ist alphabetisch sortiert nach term", () => {
    for (let i = 1; i < GLOSSAR_EINTRAEGE.length; i++) {
      const prev = GLOSSAR_EINTRAEGE[i - 1].term;
      const curr = GLOSSAR_EINTRAEGE[i].term;
      expect(prev.localeCompare(curr, "de")).toBeLessThanOrEqual(0);
    }
  });

  it("enthaelt die 13 Pflicht-Begriffe aus AC-1.7", () => {
    const pflichtIds = [
      "genehmigungsfreistellung",
      "kenntnisgabeverfahren",
      "toeb",
      "verfahrensart",
      "formelle-pruefung",
      "materielle-pruefung",
      "frist-hemmung",
      "gebaeueklasse",
      "sonderbau",
      "freizeichnung",
      "nutzungsaenderung",
      "bauherr",
      "aktenzeichen",
    ];
    for (const id of pflichtIds) {
      expect(GLOSSAR_MAP.has(id)).toBe(true);
    }
  });

  it("hat eindeutige IDs", () => {
    const ids = GLOSSAR_EINTRAEGE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hat kurzerklaerung <= 200 Zeichen (AC-1.2)", () => {
    for (const eintrag of GLOSSAR_EINTRAEGE) {
      expect(eintrag.kurzerklaerung.length).toBeLessThanOrEqual(200);
    }
  });

  it("hat bundeslaender nur mit gueltigen Kuerzeln", () => {
    const gueltig = new Set(["NW", "BW", "BY", "HE", "NI", "SN", "RP", "SH", "TH", "BB", "MV", "ST", "SL", "HB", "HH", "BE"]);
    for (const eintrag of GLOSSAR_EINTRAEGE) {
      if (eintrag.bundeslaender) {
        for (const bl of eintrag.bundeslaender) {
          expect(gueltig.has(bl)).toBe(true);
        }
      }
    }
  });
});

describe("GLOSSAR_MAP", () => {
  it("hat gleiche Groesse wie GLOSSAR_EINTRAEGE", () => {
    expect(GLOSSAR_MAP.size).toBe(GLOSSAR_EINTRAEGE.length);
  });

  it("findet Eintrag per ID", () => {
    const eintrag = GLOSSAR_MAP.get("verfahrensart");
    expect(eintrag).toBeDefined();
    expect(eintrag!.term).toBe("Verfahrensart");
  });
});

describe("sucheGlossar", () => {
  it("findet Begriffe per Term", () => {
    const ergebnis = sucheGlossar("Gebäudeklasse");
    expect(ergebnis.length).toBeGreaterThanOrEqual(1);
    expect(ergebnis[0].id).toBe("gebaeueklasse");
  });

  it("findet Begriffe per Kurzerklaerung", () => {
    const ergebnis = sucheGlossar("Baugenehmigung");
    expect(ergebnis.length).toBeGreaterThanOrEqual(1);
  });

  it("ist case-insensitive", () => {
    const ergebnis = sucheGlossar("sonderbau");
    expect(ergebnis.length).toBeGreaterThanOrEqual(1);
  });

  it("filtert nach Bundesland", () => {
    const nrw = sucheGlossar("", "NW");
    const bw = sucheGlossar("", "BW");
    // PROJ-60: Kenntnisgabeverfahren ist BW-spezifisch (§ 51 LBO BW), nicht NRW
    // BW-spezifische Begriffe (z.B. Kenntnisgabe) sollten in NRW nicht erscheinen
    const kenntnisgabeNrw = nrw.find((e) => e.id === "kenntnisgabeverfahren");
    expect(kenntnisgabeNrw).toBeUndefined();
    // Aber in BW schon
    const kenntnisgabeBw = bw.find((e) => e.id === "kenntnisgabeverfahren");
    expect(kenntnisgabeBw).toBeDefined();
    // Baulast ist NRW-spezifisch, sollte in BW nicht erscheinen
    const baulastBw = bw.find((e) => e.id === "baulast");
    expect(baulastBw).toBeUndefined();
    const baulastNrw = nrw.find((e) => e.id === "baulast");
    expect(baulastNrw).toBeDefined();
  });

  it("gibt leeres Array bei keinem Treffer", () => {
    const ergebnis = sucheGlossar("xyzqwerty123");
    expect(ergebnis).toEqual([]);
  });
});
