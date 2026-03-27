import { build0201 } from "./build-0201";
import type { Build0201Params } from "./build-0201";

const MOCK_UUID = "33333333-3333-3333-3333-333333333333";
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

const baseParams: Omit<Build0201Params, "antragVollstaendig" | "befundliste" | "fristDatum" | "spaetestesGenehmigungsdatum" | "anschreiben"> = {
  bezugNachrichtenUuid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  bezugNachrichtentyp: "0200",
  bezugErstellungszeit: "2026-03-15T10:00:00Z",
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

describe("build0201", () => {
  describe("antragVollstaendig=false (Befunde)", () => {
    it("generiert XML mit befundFrist und befundliste", () => {
      const xml = build0201({
        ...baseParams,
        antragVollstaendig: false,
        befundliste: [
          "Lageplan fehlt",
          "Brandschutznachweis unvollständig",
        ],
        fristDatum: "2026-04-30",
        anschreiben: "Bitte reichen Sie die fehlenden Unterlagen fristgerecht nach.",
      });

      // Root-Element (qualified, xbau-Namespace)
      expect(xml).toContain("baugenehmigung.formellePruefung.0201");

      // Produkt-Attribute
      expect(xml).toContain('produkt="FV-SaaS"');
      expect(xml).toContain('standard="XBau-Hochbau"');
      expect(xml).toContain('version="2.6"');

      // Nachrichtenkopf
      expect(xml).toContain("<nachrichtenkopf.g2g>");
      expect(xml).toContain(">0201</code>");

      // antragVollstaendig
      expect(xml).toContain(">false<");

      // befundFrist
      expect(xml).toContain("befundFrist");
      expect(xml).toContain("befundliste");
      expect(xml).toContain("Lageplan fehlt");
      expect(xml).toContain("Brandschutznachweis unvollständig");
      expect(xml).toContain(">2026-04-30<");

      // Codelisten
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:formellebefundeart");
      expect(xml).toContain("artDesBefundes");

      // anschreiben
      expect(xml).toContain("anschreiben");
      expect(xml).toContain("Bitte reichen Sie die fehlenden Unterlagen fristgerecht nach.");

      // Kein unterlagenAntragVollstaendig
      expect(xml).not.toContain("unterlagenAntragVollstaendig");
    });
  });

  describe("antragVollstaendig=true (Vollstaendig)", () => {
    it("generiert XML mit unterlagenAntragVollstaendig", () => {
      const xml = build0201({
        ...baseParams,
        antragVollstaendig: true,
        spaetestesGenehmigungsdatum: "2026-06-30",
      });

      // antragVollstaendig
      expect(xml).toContain(">true<");

      // unterlagenAntragVollstaendig
      expect(xml).toContain("unterlagenAntragVollstaendig");
      expect(xml).toContain("genehmigungsdatum");
      expect(xml).toContain("spaetestesGenehmigungsdatum");
      expect(xml).toContain(">2026-06-30<");

      // Keine befundFrist
      expect(xml).not.toContain("befundFrist");
      expect(xml).not.toContain("befundliste");
    });
  });

  it("enthält bezug mit Aktenzeichen und Referenz", () => {
    const xml = build0201({
      ...baseParams,
      antragVollstaendig: true,
      spaetestesGenehmigungsdatum: "2026-06-30",
    });

    expect(xml).toContain("<referenz>f180ba27-4549-4752-ab01-a7513866faa6</referenz>");
    expect(xml).toContain("<vorgang>BG-2026-00042</vorgang>");
    expect(xml).toContain("<bezugNachricht>");
    expect(xml).toContain(">aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee<");
  });

  it("enthält Namespace-Deklarationen", () => {
    const xml = build0201({
      ...baseParams,
      antragVollstaendig: true,
      spaetestesGenehmigungsdatum: "2026-06-30",
    });

    expect(xml).toContain("http://www.xleitstelle.de/xbau/2/6");
    expect(xml).toContain("http://www.xleitstelle.de/xbau/kernmodul/1/3/0");
  });
});
