import { build1180 } from "./build-1180";
import type { Build1180Params } from "./build-1180";

const MOCK_UUID = "22222222-2222-2222-2222-222222222222";
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

const defaultParams: Build1180Params = {
  quittierteNachrichtenUUID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  quittierterNachrichtentyp: "0200",
  quittierteErstellungszeit: "2026-03-15T10:00:00Z",
  aktenzeichen: "BG-2026-00042",
  referenzUuid: "f180ba27-4549-4752-ab01-a7513866faa6",
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

describe("build1180", () => {
  it("generiert valides XML mit Root-Element und Pflichtfeldern", () => {
    const xml = build1180(defaultParams);

    // Root-Element
    expect(xml).toContain("prozessnachrichten.generischeQuittierungEingang.1180");

    // Nachrichtenkopf
    expect(xml).toContain("<nachrichtenkopf.g2g>");
    expect(xml).toContain(">1180</code>");

    // Produkt-Attribute
    expect(xml).toContain('produkt="FV-SaaS"');
    expect(xml).toContain('standard="XBau-Kernmodul"');
    expect(xml).toContain('version="1.3.0"');

    // bezug
    expect(xml).toContain("<bezug>");
    expect(xml).toContain("<referenz>f180ba27-4549-4752-ab01-a7513866faa6</referenz>");
    expect(xml).toContain("<vorgang>BG-2026-00042</vorgang>");
    expect(xml).toContain("<bezugNachricht>");
    expect(xml).toContain("<nachrichtenUUID>aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</nachrichtenUUID>");

    // nachrichtentyp (Code.XBau-QuittierteNachricht)
    expect(xml).toContain("urn:xoev-de:xbau:codeliste:nachricht-eingangsquittierung");
    expect(xml).toContain(">0200</code>");
  });

  it("generiert XML ohne optionale Felder", () => {
    const params: Build1180Params = {
      ...defaultParams,
      aktenzeichen: undefined,
      referenzUuid: undefined,
    };
    const xml = build1180(params);

    expect(xml).not.toContain("<referenz>");
    expect(xml).not.toContain("<vorgang>");
    expect(xml).toContain("<bezugNachricht>");
  });

  it("enthält Autor- und Leser-Informationen", () => {
    const xml = build1180(defaultParams);

    expect(xml).toContain("<autor>");
    expect(xml).toContain("<leser>");
    expect(xml).toContain("<kennung>05315000-bauaufsicht</kennung>");
  });
});
