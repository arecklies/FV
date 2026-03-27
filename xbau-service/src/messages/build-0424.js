import { NS_XBAU, NS_XBAUK, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_HOCHBAU, VERSION_HOCHBAU } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import {
  appendBezugStatistikmeldung,
  appendAllgemeineAngaben,
  appendDatenEinzelnesGebaeude,
  appendAnsprechpartner,
} from "./statistik-helpers.js";
import crypto from "node:crypto";

/**
 * build-0424: statistik.fertigstellungRohbau.0424
 *
 * XSD: xbau-nachrichten-statistik.xsd
 * Statistikmeldung anlaesslich der Fertigstellung des Rohbaus.
 *
 * Pflichtfelder: bezug (BezugStatistikmeldung), allgemeineAngaben,
 *   datenUnterDach (DatenUnterDach), datenEinzelnesGebaeude
 * Optional: ansprechpartner
 */
export function buildStatistik0424(params) {
  const nachrichtenUUID = params.nachrichtenUUID ?? crypto.randomUUID();
  const erstellungszeitpunkt = params.erstellungszeitpunkt ?? new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAU, "statistik.fertigstellungRohbau.0424")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0424",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  appendBezugStatistikmeldung(root, params.bezug);
  appendAllgemeineAngaben(root, params.allgemeineAngaben);

  // DatenUnterDach
  const dud = root.ele(NS_XBAU, "datenUnterDach");
  dud.ele(NS_XBAU, "datumUnterDach").txt(params.datenUnterDach.datumUnterDach);
  if (params.datenUnterDach.aktenbereinigungRohbau) {
    dud.ele(NS_XBAU, "aktenbereinigungRohbau").txt("true");
  }

  appendDatenEinzelnesGebaeude(root, params.datenEinzelnesGebaeude);

  if (params.ansprechpartner) {
    appendAnsprechpartner(root, params.ansprechpartner);
  }

  return doc.end({ prettyPrint: true });
}
