/**
 * Smoke-Tests fuer Statistik-Nachrichten 0420-0427 (PROJ-57)
 *
 * Prueft: XML-Generierung ohne Fehler, korrekte Root-Elemente,
 * Nachrichtentypen, Namespace-Qualifizierung, Codelist-Attribute
 */

import { buildStatistik0420 } from "../src/messages/build-0420.js";
import { buildStatistik0421 } from "../src/messages/build-0421.js";
import { buildStatistik0422 } from "../src/messages/build-0422.js";
import { buildStatistik0423 } from "../src/messages/build-0423.js";
import { buildStatistik0424 } from "../src/messages/build-0424.js";
import { buildStatistik0425 } from "../src/messages/build-0425.js";
import { buildStatistik0426 } from "../src/messages/build-0426.js";
import { buildStatistik0427 } from "../src/messages/build-0427.js";

const BEHOERDE_AUTOR = {
  verzeichnisdienst: "S2",
  kennung: "urn:de:bund:destatis:bfs:intern:bauaufsicht:testamt",
  name: "Testbauamt",
};

const BEHOERDE_LESER = {
  verzeichnisdienst: "S2",
  kennung: "urn:de:bund:destatis:bfs:intern:statistik:testamt",
  name: "Statistisches Landesamt Test",
};

const BEZUG_STATISTIK = {
  vorgang: "AZ-2026-001",
  uuidGebaeude: "550e8400-e29b-41d4-a716-446655440000",
  ordnungsnummer: "ORD-001",
};

const ALLGEMEINE_ANGABEN = {
  anzahlDerGebaeudeImBauvorhaben: 1,
};

const DATEN_EINZELNES_GEBAEUDE = {
  baugenehmigung: {
    datumBaugenehmigung: "2026-01",
    aktenzeichen: "AZ-2026-001",
  },
};

describe("Statistik-Nachrichten 0420-0427", () => {
  describe("build-0420: statistik.datenBauvorhaben", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0420({
        nachrichtenUUID: "test-uuid-0420",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: {
          vorgang: "AZ-2026-001",
        },
        allgemeineAngaben: {
          anzahlDerGebaeudeImBauvorhaben: 2,
        },
        bauvorhabenGebaeude: [
          {
            identifikationGebaeude: {
              uuidGebaeude: "550e8400-e29b-41d4-a716-446655440000",
              gebaeudenummer: 1,
            },
          },
        ],
      });

      expect(xml).toContain("statistik.datenBauvorhaben.0420");
      expect(xml).toContain("<code>0420</code>");
      expect(xml).toContain("xmlns:xbau");
      expect(xml).toContain("xmlns:xbauk");
      expect(xml).toContain("bauvorhabenGebaeude");
      expect(xml).toContain("datenEinzelnesGebaeude");
      expect(xml).toContain("550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("build-0421: statistik.baugenehmigung", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0421({
        nachrichtenUUID: "test-uuid-0421",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
      });

      expect(xml).toContain("statistik.baugenehmigung.0421");
      expect(xml).toContain("<code>0421</code>");
      expect(xml).toContain("uuidGebaeude");
      expect(xml).toContain("baugenehmigung");
      expect(xml).toContain("AZ-2026-001");
    });
  });

  describe("build-0422: statistik.erloscheneBaugenehmigung", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0422({
        nachrichtenUUID: "test-uuid-0422",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datumErloscheneBaugenehmigung: "2026-03",
        datumAntragstellung: "2025-01",
      });

      expect(xml).toContain("statistik.erloscheneBaugenehmigung.0422");
      expect(xml).toContain("<code>0422</code>");
      expect(xml).toContain("datumErloscheneBaugenehmigung");
      expect(xml).toContain("2026-03");
    });
  });

  describe("build-0423: statistik.baubeginn", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0423({
        nachrichtenUUID: "test-uuid-0423",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenBaubeginn: {
          datumBaubeginn: "2026-02",
        },
        datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
      });

      expect(xml).toContain("statistik.baubeginn.0423");
      expect(xml).toContain("<code>0423</code>");
      expect(xml).toContain("datenBaubeginn");
      expect(xml).toContain("datumBaubeginn");
      expect(xml).toContain("2026-02");
    });
  });

  describe("build-0424: statistik.fertigstellungRohbau", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0424({
        nachrichtenUUID: "test-uuid-0424",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenUnterDach: {
          datumUnterDach: "2026-06",
          aktenbereinigungRohbau: false,
        },
        datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
      });

      expect(xml).toContain("statistik.fertigstellungRohbau.0424");
      expect(xml).toContain("<code>0424</code>");
      expect(xml).toContain("datenUnterDach");
      expect(xml).toContain("datumUnterDach");
    });
  });

  describe("build-0425: statistik.baufertigstellung", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0425({
        nachrichtenUUID: "test-uuid-0425",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenBaufertigstellung: {
          datumBaufertigstellung: "2026-12-15",
        },
        datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
      });

      expect(xml).toContain("statistik.baufertigstellung.0425");
      expect(xml).toContain("<code>0425</code>");
      expect(xml).toContain("datenBaufertigstellung");
      expect(xml).toContain("2026-12-15");
    });
  });

  describe("build-0426: statistik.bauabgang", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0426({
        nachrichtenUUID: "test-uuid-0426",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenBauabgang: {
          bauabgang: {
            abgangszeitraumDatum: "2026-03",
            alterDesGebaeudes: "1",
            umfangDesAbgangs: "1",
            ursacheDesAbgangs: "1",
          },
          artDesWohngebaeudes: "01",
        },
      });

      expect(xml).toContain("statistik.bauabgang.0426");
      expect(xml).toContain("<code>0426</code>");
      expect(xml).toContain("datenBauabgang");
      expect(xml).toContain("abgangszeitraumDatum");
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:abgangumfang");
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:abgangursache");
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:gebaeudealter");
    });
  });

  describe("build-0427: statistik.bauueberhang", () => {
    it("sollte gueltiges XML generieren", () => {
      const xml = buildStatistik0427({
        nachrichtenUUID: "test-uuid-0427",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenBauueberhang: {
          bauueberhang: "01",
          datumBaubeginn: "2026-02",
        },
        datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
      });

      expect(xml).toContain("statistik.bauueberhang.0427");
      expect(xml).toContain("<code>0427</code>");
      expect(xml).toContain("datenBauueberhang");
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:baufortschritt");
    });
  });

  describe("Codelist-Attribute", () => {
    it("sollte korrekte listURI und listVersionID fuer Statistik-Codelisten setzen", () => {
      const xml = buildStatistik0421({
        nachrichtenUUID: "test-codelist",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenEinzelnesGebaeude: {
          artDesBauens: "neubau",
          baugenehmigung: {
            datumBaugenehmigung: "2026-01",
          },
          ueberwiegendVerwendeterBaustoff: "01",
          angabenGebaeude: {
            artDesWohngebaeudes: "01",
            haustypWohngebaeude: "01",
          },
          kuehlung: "01",
          statusSozialerWohnungsbau: "01",
        },
      });

      expect(xml).toContain('listURI="urn:xoev-de:xbau:codeliste:artdesbauens"');
      expect(xml).toContain('listVersionID="1.0"');
      expect(xml).toContain('listURI="urn:xoev-de:xbau:codeliste:baustoff"');
      expect(xml).toContain('listURI="urn:xoev-de:xbau:codeliste:wohngebaeudeart"');
      expect(xml).toContain('listURI="urn:xoev-de:xbau:codeliste:haustypwohngebaeude"');
      expect(xml).toContain('listURI="urn:xoev-de:xbau:codeliste:kuehlung"');
      expect(xml).toContain('listURI="urn:xoev-de:xbau:codeliste:statussozialerwohnungsbau"');
    });
  });

  describe("Namespace-Qualifizierung", () => {
    it("sollte nachrichtenspezifische Elemente mit xbau-Namespace qualifizieren", () => {
      const xml = buildStatistik0421({
        nachrichtenUUID: "test-ns",
        erstellungszeitpunkt: "2026-03-27T10:00:00Z",
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        bezug: BEZUG_STATISTIK,
        allgemeineAngaben: ALLGEMEINE_ANGABEN,
        datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
      });

      // Statistik XSD hat elementFormDefault="qualified" — alle Elemente im xbau-Namespace
      expect(xml).toContain("xbau:bezug");
      expect(xml).toContain("xbau:allgemeineAngaben");
      expect(xml).toContain("xbau:datenEinzelnesGebaeude");
      expect(xml).toContain("xbau:baugenehmigung");
    });
  });
});
