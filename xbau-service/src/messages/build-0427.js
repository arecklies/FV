import { NS_XBAU, NS_XBAUK, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_HOCHBAU, VERSION_HOCHBAU } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import {
  appendBezugStatistikmeldung,
  appendAllgemeineAngaben,
  appendDatenBauueberhang,
  appendDatenEinzelnesGebaeude,
  appendAnsprechpartner,
} from "./statistik-helpers.js";
import crypto from "node:crypto";

/**
 * build-0427: statistik.bauueberhang.0427
 *
 * XSD: xbau-nachrichten-statistik.xsd
 * Rechtsgrundlage: § 1 (2) Nr. 3 HBauStatG
 * Datenuebermittlung mit Informationen zum Bauueberhang.
 *
 * Pflichtfelder: bezug (BezugStatistikmeldung), allgemeineAngaben,
 *   datenBauueberhang, datenEinzelnesGebaeude
 * Optional: ansprechpartner
 */
export function buildStatistik0427(params) {
  const nachrichtenUUID = params.nachrichtenUUID ?? crypto.randomUUID();
  const erstellungszeitpunkt = params.erstellungszeitpunkt ?? new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAU, "statistik.bauueberhang.0427")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0427",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  appendBezugStatistikmeldung(root, params.bezug);
  appendAllgemeineAngaben(root, params.allgemeineAngaben);
  appendDatenBauueberhang(root, params.datenBauueberhang);
  appendDatenEinzelnesGebaeude(root, params.datenEinzelnesGebaeude);

  if (params.ansprechpartner) {
    appendAnsprechpartner(root, params.ansprechpartner);
  }

  return doc.end({ prettyPrint: true });
}
