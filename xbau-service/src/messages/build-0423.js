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
 * build-0423: statistik.baubeginn.0423
 *
 * XSD: xbau-nachrichten-statistik.xsd
 * Statistikmeldung anlaesslich des Baubeginns.
 *
 * Pflichtfelder: bezug (BezugStatistikmeldung), allgemeineAngaben,
 *   datenBaubeginn (DatenBaubeginn), datenEinzelnesGebaeude
 * Optional: ansprechpartner
 */
export function buildStatistik0423(params) {
  const nachrichtenUUID = params.nachrichtenUUID ?? crypto.randomUUID();
  const erstellungszeitpunkt = params.erstellungszeitpunkt ?? new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAU, "statistik.baubeginn.0423")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0423",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  appendBezugStatistikmeldung(root, params.bezug);
  appendAllgemeineAngaben(root, params.allgemeineAngaben);

  // DatenBaubeginn
  const dbb = root.ele(NS_XBAU, "datenBaubeginn");
  dbb.ele(NS_XBAU, "datumBaubeginn").txt(params.datenBaubeginn.datumBaubeginn);
  if (params.datenBaubeginn.aktenbereinigungBaubeginn) {
    dbb.ele(NS_XBAU, "aktenbereinigungBaubeginn").txt("true");
  }

  appendDatenEinzelnesGebaeude(root, params.datenEinzelnesGebaeude);

  if (params.ansprechpartner) {
    appendAnsprechpartner(root, params.ansprechpartner);
  }

  return doc.end({ prettyPrint: true });
}
