import { build1100 } from "./build-1100";
import type { Build1100Params } from "./build-1100";

// Mock crypto.randomUUID
const MOCK_UUID = "11111111-1111-1111-1111-111111111111";
const originalRandomUUID = globalThis.crypto?.randomUUID;

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: () => MOCK_UUID,
    },
    writable: true,
  });
});

afterAll(() => {
  if (originalRandomUUID) {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        ...globalThis.crypto,
        randomUUID: originalRandomUUID,
      },
      writable: true,
    });
  }
});

const defaultParams: Build1100Params = {
  fehlerkennzahl: "X001",
  fehlertext: "XML-Struktur ungültig",
  abgewieseneNachrichtBase64: Buffer.from("<test>abc</test>").toString("base64"),
  abgewieseneNachrichtenUUID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  abgewiesenerNachrichtentyp: "0200",
  abgewieseneErstellungszeit: "2026-03-15T10:00:00Z",
  autor: {
    verzeichnisdienst: "psw",
    kennung: "05315000-bauaufsicht",
    name: "Bauaufsichtsbehörde Köln",
  },
  leser: {
    verzeichnisdienst: "psw",
    kennung: "eca-antragsservice",
    name: "ECA Antragsservice",
  },
};

describe("build1100", () => {
  it("generiert valides XML mit Root-Element und Pflichtfeldern", () => {
    const xml = build1100(defaultParams);

    // Root-Element
    expect(xml).toContain("prozessnachrichten.rueckweisung.G2G.1100");

    // Nachrichtenkopf
    expect(xml).toContain("<nachrichtenkopf.g2g>");
    expect(xml).toContain("<nachrichtenUUID>");
    expect(xml).toContain("<nachrichtentyp");
    expect(xml).toContain(">1100</code>");

    // Produkt-Attribute
    expect(xml).toContain('produkt="FV-SaaS"');
    expect(xml).toContain('standard="XBau-Kernmodul"');
    expect(xml).toContain('version="1.3.0"');

    // rueckweisungDaten
    expect(xml).toContain("<rueckweisungDaten>");
    expect(xml).toContain("<rueckweisungsgrund>");
    expect(xml).toContain("<grund");
    expect(xml).toContain(">X001</code>");
    expect(xml).toContain("<fehlertext>XML-Struktur ungültig</fehlertext>");

    // idNachricht
    expect(xml).toContain("<idNachricht>");
    expect(xml).toContain("<nachrichtenUUID>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</nachrichtenUUID>");

    // Base64-Nachricht
    expect(xml).toContain("<nachricht>");

    // Codelisten-URIs
    expect(xml).toContain("urn:xoev-de:xbau:codeliste:xbau-fehlerkennzahlen");
  });

  it("generiert XML ohne fehlertext wenn nicht angegeben", () => {
    const params = { ...defaultParams, fehlertext: undefined };
    const xml = build1100(params);

    expect(xml).not.toContain("<fehlertext>");
    expect(xml).toContain("<rueckweisungsgrund>");
  });

  it("enthält Autor- und Leser-Informationen", () => {
    const xml = build1100(defaultParams);

    expect(xml).toContain("<autor>");
    expect(xml).toContain("<leser>");
    expect(xml).toContain("<kennung>05315000-bauaufsicht</kennung>");
    expect(xml).toContain("<kennung>eca-antragsservice</kennung>");
  });
});
