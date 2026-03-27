/**
 * schematron.test.js (PROJ-59)
 *
 * Tests fuer Schematron-Validator.
 * Saxon-JS wird gemockt (ESM-Inkompatibilitaet mit Jest, ADR-015 AC-6).
 */

import { jest } from "@jest/globals";
import fs from "node:fs";

// -- Mocks --

// Mock fuer Saxon-JS: simuliert SVRL-Output
const mockSaxonTransform = jest.fn();

jest.unstable_mockModule("saxon-js", () => ({
  default: {
    transform: mockSaxonTransform,
  },
}));

// SEF-Datei simulieren: existsSync und readFileSync spyen
const MOCK_SEF = JSON.stringify({ type: "SEF", version: "2.0" });
const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue(MOCK_SEF);

// -- Import nach Mocking --
const { validateSchematron, toRueckweisungParams, resetCache } = await import(
  "../src/schematron-validator.js"
);

// -- Test-Fixtures --

const VALID_SVRL = `<?xml version="1.0" encoding="UTF-8"?>
<svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl">
  <svrl:fired-rule context="//nachrichtenkopf.g2g" id="rule-sch-xbau-001"/>
  <svrl:fired-rule context="//nachrichtenkopf.g2g" id="rule-sch-xbau-002"/>
</svrl:schematron-output>`;

const INVALID_SVRL = `<?xml version="1.0" encoding="UTF-8"?>
<svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl">
  <svrl:fired-rule context="//nachrichtenkopf.g2g" id="rule-sch-xbau-001"/>
  <svrl:fired-rule context="//nachrichtenkopf.g2g" id="rule-sch-xbau-002"/>
  <svrl:failed-assert id="sch-xbau-001" location="/xbau:baugenehmigung.antrag.0200/nachrichtenkopf.g2g">
    <svrl:text>Eine Behoerdenkennung im DVDV muss aus einem Praefix aus drei Kleinbuchstaben, einem Doppelpunkt und einer Folge von Ziffern bestehen.</svrl:text>
  </svrl:failed-assert>
</svrl:schematron-output>`;

const MULTI_ERROR_SVRL = `<?xml version="1.0" encoding="UTF-8"?>
<svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl">
  <svrl:fired-rule context="//nachrichtenkopf.g2g" id="rule-sch-xbau-001"/>
  <svrl:fired-rule context="//statistik" id="rule-sch-stat-003"/>
  <svrl:fired-rule context="//anzeige" id="rule-sch-anz-001"/>
  <svrl:failed-assert id="sch-xbau-001" location="/nachrichtenkopf.g2g">
    <svrl:text>Behoerdenkennung ungueltig</svrl:text>
  </svrl:failed-assert>
  <svrl:failed-assert id="sch-stat-003" location="/statistik/heizung">
    <svrl:text>Kombination primaerer und sekundaerer Waermeenergie nicht plausibel</svrl:text>
  </svrl:failed-assert>
  <svrl:failed-assert id="sch-anz-001" location="/anzeige">
    <svrl:text>Anzeigender fehlt</svrl:text>
  </svrl:failed-assert>
</svrl:schematron-output>`;

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<xbau:baugenehmigung.antrag.0200 xmlns:xbau="http://www.xleitstelle.de/xbau/2/6">
  <nachrichtenkopf.g2g>
    <autor><verzeichnisdienst><code>DVDV</code></verzeichnisdienst><kennung>abc:123</kennung></autor>
    <leser><verzeichnisdienst><code>DVDV</code></verzeichnisdienst><kennung>def:456</kennung></leser>
  </nachrichtenkopf.g2g>
</xbau:baugenehmigung.antrag.0200>`;

// -- Tests --

describe("validateSchematron", () => {
  beforeEach(() => {
    resetCache();
    mockSaxonTransform.mockReset();
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue(MOCK_SEF);
  });

  it("sollte gueltige Nachricht als valid zurueckgeben", async () => {
    mockSaxonTransform.mockResolvedValue({
      principalResult: VALID_SVRL,
    });

    const result = await validateSchematron(SAMPLE_XML);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.ruleCount).toBe(2);
  });

  it("sollte ungueltige Nachricht mit Fehlern zurueckgeben", async () => {
    mockSaxonTransform.mockResolvedValue({
      principalResult: INVALID_SVRL,
    });

    const result = await validateSchematron(SAMPLE_XML);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe("sch-xbau-001");
    expect(result.errors[0].fehlerkennzahl).toBe("S001");
    expect(result.errors[0].text).toContain("Behoerdenkennung");
  });

  it("sollte mehrere Fehler mit korrekten Fehlerkennzahlen zurueckgeben", async () => {
    mockSaxonTransform.mockResolvedValue({
      principalResult: MULTI_ERROR_SVRL,
    });

    const result = await validateSchematron(SAMPLE_XML);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);

    // Pruefen der S-Serie-Fehlerkennzahlen je Regel-Praefix
    expect(result.errors[0].fehlerkennzahl).toBe("S001"); // sch-xbau -> S001
    expect(result.errors[1].fehlerkennzahl).toBe("S002"); // sch-stat -> S002
    expect(result.errors[2].fehlerkennzahl).toBe("S003"); // sch-anz  -> S003
  });

  it("sollte Saxon-JS-Fehler abfangen und als S001 zurueckgeben", async () => {
    mockSaxonTransform.mockRejectedValue(new Error("XML parsing failed"));

    const result = await validateSchematron(SAMPLE_XML);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe("SAXON-ERROR");
    expect(result.errors[0].fehlerkennzahl).toBe("S001");
    expect(result.errors[0].text).toContain("XML parsing failed");
  });

  it("sollte bei leerem xmlString einen Fehler werfen", async () => {
    await expect(validateSchematron("")).rejects.toThrow(
      "xmlString muss ein nicht-leerer String sein"
    );
    await expect(validateSchematron(null)).rejects.toThrow(
      "xmlString muss ein nicht-leerer String sein"
    );
  });

  it("sollte Saxon-JS mit korrekten Parametern aufrufen", async () => {
    mockSaxonTransform.mockResolvedValue({
      principalResult: VALID_SVRL,
    });

    await validateSchematron(SAMPLE_XML);

    expect(mockSaxonTransform).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: SAMPLE_XML,
        destination: "serialized",
        stylesheetInternal: expect.any(Object),
      }),
      "async"
    );
  });

  it("sollte Fehler werfen wenn SEF-Datei nicht existiert", async () => {
    existsSyncSpy.mockReturnValue(false);

    await expect(validateSchematron(SAMPLE_XML)).rejects.toThrow("SEF-Datei nicht gefunden");
  });
});

describe("toRueckweisungParams", () => {
  it("sollte null zurueckgeben bei gueltigem Ergebnis", () => {
    const result = { valid: true, errors: [], durationMs: 100, ruleCount: 10 };
    expect(toRueckweisungParams(result)).toBeNull();
  });

  it("sollte Fehlerkennzahl und Text fuer Rueckweisung zurueckgeben", () => {
    const result = {
      valid: false,
      errors: [
        {
          id: "sch-xbau-001",
          fehlerkennzahl: "S001",
          text: "Behoerdenkennung ungueltig",
          location: "/nachrichtenkopf.g2g",
          rule: "sch-xbau-001",
        },
      ],
      durationMs: 250,
      ruleCount: 10,
    };

    const params = toRueckweisungParams(result);

    expect(params).not.toBeNull();
    expect(params.fehlerkennzahl).toBe("S001");
    expect(params.fehlertext).toContain("Schematron-Validierung fehlgeschlagen");
    expect(params.fehlertext).toContain("1 Fehler");
    expect(params.fehlertext).toContain("sch-xbau-001");
  });

  it("sollte alle Fehler im Text zusammenfassen", () => {
    const result = {
      valid: false,
      errors: [
        { id: "sch-xbau-001", fehlerkennzahl: "S001", text: "Fehler 1", location: "", rule: "" },
        { id: "sch-stat-003", fehlerkennzahl: "S002", text: "Fehler 2", location: "", rule: "" },
      ],
      durationMs: 300,
      ruleCount: 20,
    };

    const params = toRueckweisungParams(result);

    expect(params.fehlertext).toContain("2 Fehler");
    expect(params.fehlertext).toContain("[S001]");
    expect(params.fehlertext).toContain("[S002]");
    expect(params.fehlerkennzahl).toBe("S001"); // Erste Fehlerkennzahl
  });
});
