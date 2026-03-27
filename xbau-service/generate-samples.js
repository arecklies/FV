#!/usr/bin/env node
/**
 * Generiert alle verfuegbaren XBau-Nachrichten als Sample-XMLs
 * und legt sie im output/-Ordner ab.
 *
 * Ausfuehrung: cd xbau-service && node generate-samples.js
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { build0201 } from "./src/messages/build-0201.js";
import { build1100 } from "./src/messages/build-1100.js";
import { build1180 } from "./src/messages/build-1180.js";
import { buildStatistik0420 } from "./src/messages/build-0420.js";
import { buildStatistik0421 } from "./src/messages/build-0421.js";
import { buildStatistik0422 } from "./src/messages/build-0422.js";
import { buildStatistik0423 } from "./src/messages/build-0423.js";
import { buildStatistik0424 } from "./src/messages/build-0424.js";
import { buildStatistik0425 } from "./src/messages/build-0425.js";
import { buildStatistik0426 } from "./src/messages/build-0426.js";
import { buildStatistik0427 } from "./src/messages/build-0427.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output");
mkdirSync(OUTPUT_DIR, { recursive: true });

// -- Gemeinsame Testdaten --

const BAUAUFSICHT = {
  verzeichnisdienst: "S2",
  kennung: "urn:de:bund:destatis:bfs:intern:bauaufsicht:dortmund",
  name: "Bauordnungsamt Stadt Dortmund",
};

const STATISTIK_AMT = {
  verzeichnisdienst: "S2",
  kennung: "urn:de:bund:destatis:bfs:intern:statistik:nrw",
  name: "Information und Technik Nordrhein-Westfalen (IT.NRW)",
};

const ENTWURFSVERFASSER = {
  verzeichnisdienst: "S2",
  kennung: "urn:de:bund:destatis:bfs:intern:architekt:ev001",
  name: "Architekturbuero Schmidt & Partner",
};

const BEZUG_STATISTIK = {
  vorgang: "2026/0042/BG",
  uuidGebaeude: "550e8400-e29b-41d4-a716-446655440000",
  ordnungsnummer: "ORD-001",
};

const ALLGEMEINE_ANGABEN = {
  anzahlDerGebaeudeImBauvorhaben: 1,
};

const DATEN_EINZELNES_GEBAEUDE = {
  baugenehmigung: {
    datumBaugenehmigung: "2026-01",
    aktenzeichen: "2026/0042/BG",
  },
};

const TS = "2026-03-27T14:30:00Z";

// -- Nachrichten generieren --

const nachrichten = [];

// 0201: Formelle Pruefung (Hochbau)
nachrichten.push({
  datei: "baugenehmigung.formellePruefung.0201_sample.xml",
  typ: "0201",
  xml: build0201({
    autor: BAUAUFSICHT,
    leser: ENTWURFSVERFASSER,
    referenzUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    aktenzeichen: "2026/0042/BG",
    bezugNachrichtenUuid: "f0e1d2c3-b4a5-6789-0123-456789abcdef",
    bezugNachrichtentyp: "0200",
    bezugErstellungszeit: "2026-03-20T09:00:00Z",
    antragVollstaendig: false,
    befunde: [
      { text: "Standsicherheitsnachweis fehlt (§ 68 BauO NRW)" },
      { text: "Brandschutzkonzept unvollstaendig (§ 69 BauO NRW)" },
      { text: "Lageplan nicht massstabsgerecht" },
    ],
    nachforderungsfrist: "2026-04-27",
    anschreiben: "Sehr geehrte Damen und Herren,\n\ndie formelle Pruefung Ihres Bauantrags hat ergeben, dass die oben aufgefuehrten Unterlagen fehlen oder unvollstaendig sind. Bitte reichen Sie diese bis zum 27.04.2026 nach.\n\nBei Fristablauf ohne Nachreichung gilt der Antrag gemaess § 72 Abs. 2 BauO NRW als zurueckgenommen.\n\nMit freundlichen Gruessen\nBauordnungsamt Stadt Dortmund",
  }),
});

// 0201: Formelle Pruefung (vollstaendig)
nachrichten.push({
  datei: "baugenehmigung.formellePruefung.0201_vollstaendig_sample.xml",
  typ: "0201",
  xml: build0201({
    autor: BAUAUFSICHT,
    leser: ENTWURFSVERFASSER,
    referenzUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    aktenzeichen: "2026/0042/BG",
    bezugNachrichtenUuid: "f0e1d2c3-b4a5-6789-0123-456789abcdef",
    bezugNachrichtentyp: "0200",
    bezugErstellungszeit: "2026-03-20T09:00:00Z",
    antragVollstaendig: true,
    befunde: [],
    anschreiben: "Sehr geehrte Damen und Herren,\n\nIhr Bauantrag ist vollstaendig. Die materielle Pruefung wird eingeleitet.\n\nMit freundlichen Gruessen\nBauordnungsamt Stadt Dortmund",
  }),
});

// 1100: Rueckweisung G2G
nachrichten.push({
  datei: "prozessnachrichten.rueckweisung.G2G.1100_sample.xml",
  typ: "1100",
  xml: build1100({
    autor: BAUAUFSICHT,
    leser: ENTWURFSVERFASSER,
    fehlerkennzahl: "X001",
    fehlertext: "Die Nachricht ist nicht XSD-konform: Element 'bauherr' fehlt im Pflichtblock 'antragsteller'.",
    abgewieseNeNachrichtBase64: "PD94bWwgdmVyc2lvbj0iMS4wIj8+PGJhdWdlbmVobWlndW5nLmFudHJhZy4wMjAwLz4=",
    bezugNachrichtenUuid: "invalid-msg-uuid-001",
    bezugNachrichtentyp: "0200",
    bezugErstellungszeit: "2026-03-25T08:00:00Z",
  }),
});

// 1180: Eingangsquittung
nachrichten.push({
  datei: "prozessnachrichten.generischeQuittierungEingang.1180_sample.xml",
  typ: "1180",
  xml: build1180({
    autor: BAUAUFSICHT,
    leser: ENTWURFSVERFASSER,
    bezugNachrichtenUuid: "f0e1d2c3-b4a5-6789-0123-456789abcdef",
    bezugNachrichtentyp: "0200",
    bezugErstellungszeit: "2026-03-20T09:00:00Z",
  }),
});

// 0420: Statistik Daten Bauvorhaben
nachrichten.push({
  datei: "statistik.datenBauvorhaben.0420_sample.xml",
  typ: "0420",
  xml: buildStatistik0420({
    nachrichtenUUID: "stat-0420-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: { vorgang: "2026/0042/BG" },
    allgemeineAngaben: { anzahlDerGebaeudeImBauvorhaben: 2 },
    bauvorhabenGebaeude: [
      {
        identifikationGebaeude: {
          uuidGebaeude: "550e8400-e29b-41d4-a716-446655440000",
          gebaeudenummer: 1,
        },
      },
      {
        identifikationGebaeude: {
          uuidGebaeude: "660f9500-f30c-52e5-b827-557766551111",
          gebaeudenummer: 2,
        },
      },
    ],
    ansprechpartner: {
      name: "Ralf Meier",
      telefon: "0231-555-4200",
      email: "ralf.meier@stadt-dortmund.de",
      einwilligung: true,
    },
  }),
});

// 0421: Statistik Baugenehmigung
nachrichten.push({
  datei: "statistik.baugenehmigung.0421_sample.xml",
  typ: "0421",
  xml: buildStatistik0421({
    nachrichtenUUID: "stat-0421-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: BEZUG_STATISTIK,
    allgemeineAngaben: ALLGEMEINE_ANGABEN,
    datenEinzelnesGebaeude: {
      artDesBauens: "neubau",
      baugenehmigung: {
        datumBaugenehmigung: "2026-01",
        aktenzeichen: "2026/0042/BG",
      },
      ueberwiegendVerwendeterBaustoff: "01",
      angabenGebaeude: {
        artDesWohngebaeudes: "01",
        haustypWohngebaeude: "01",
      },
      kuehlung: "01",
      statusSozialerWohnungsbau: "00",
    },
  }),
});

// 0422: Statistik Erloschene Baugenehmigung
nachrichten.push({
  datei: "statistik.erloscheneBaugenehmigung.0422_sample.xml",
  typ: "0422",
  xml: buildStatistik0422({
    nachrichtenUUID: "stat-0422-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: BEZUG_STATISTIK,
    allgemeineAngaben: ALLGEMEINE_ANGABEN,
    datumErloscheneBaugenehmigung: "2026-03",
    datumAntragstellung: "2023-01",
  }),
});

// 0423: Statistik Baubeginn
nachrichten.push({
  datei: "statistik.baubeginn.0423_sample.xml",
  typ: "0423",
  xml: buildStatistik0423({
    nachrichtenUUID: "stat-0423-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: BEZUG_STATISTIK,
    allgemeineAngaben: ALLGEMEINE_ANGABEN,
    datenBaubeginn: {
      datumBaubeginn: "2026-02",
    },
    datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
  }),
});

// 0424: Statistik Fertigstellung Rohbau
nachrichten.push({
  datei: "statistik.fertigstellungRohbau.0424_sample.xml",
  typ: "0424",
  xml: buildStatistik0424({
    nachrichtenUUID: "stat-0424-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: BEZUG_STATISTIK,
    allgemeineAngaben: ALLGEMEINE_ANGABEN,
    datenUnterDach: {
      datumUnterDach: "2026-06",
      aktenbereinigungRohbau: false,
    },
    datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
  }),
});

// 0425: Statistik Baufertigstellung
nachrichten.push({
  datei: "statistik.baufertigstellung.0425_sample.xml",
  typ: "0425",
  xml: buildStatistik0425({
    nachrichtenUUID: "stat-0425-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: BEZUG_STATISTIK,
    allgemeineAngaben: ALLGEMEINE_ANGABEN,
    datenBaufertigstellung: {
      datumBaufertigstellung: "2026-12-15",
    },
    datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
  }),
});

// 0426: Statistik Bauabgang
nachrichten.push({
  datei: "statistik.bauabgang.0426_sample.xml",
  typ: "0426",
  xml: buildStatistik0426({
    nachrichtenUUID: "stat-0426-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
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
  }),
});

// 0427: Statistik Bauueberhang
nachrichten.push({
  datei: "statistik.bauueberhang.0427_sample.xml",
  typ: "0427",
  xml: buildStatistik0427({
    nachrichtenUUID: "stat-0427-" + Date.now(),
    erstellungszeitpunkt: TS,
    autor: BAUAUFSICHT,
    leser: STATISTIK_AMT,
    bezug: BEZUG_STATISTIK,
    allgemeineAngaben: ALLGEMEINE_ANGABEN,
    datenBauueberhang: {
      bauueberhang: "01",
      datumBaubeginn: "2026-02",
    },
    datenEinzelnesGebaeude: DATEN_EINZELNES_GEBAEUDE,
  }),
});

// -- Dateien schreiben --

console.log(`\nXBau 2.6 Sample-XML-Generierung`);
console.log(`================================\n`);

let success = 0;
let errors = 0;

for (const n of nachrichten) {
  try {
    const path = join(OUTPUT_DIR, n.datei);
    writeFileSync(path, n.xml, "utf-8");
    const size = Buffer.byteLength(n.xml, "utf-8");
    console.log(`  ✓ ${n.typ}  ${n.datei} (${size} Bytes)`);
    success++;
  } catch (err) {
    console.error(`  ✗ ${n.typ}  ${n.datei}: ${err.message}`);
    errors++;
  }
}

console.log(`\n${success} Nachrichten generiert, ${errors} Fehler.`);
console.log(`Ausgabeverzeichnis: ${OUTPUT_DIR}\n`);
