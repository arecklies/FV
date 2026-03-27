import { NS_XBAU, NS_XBAUK, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_HOCHBAU, VERSION_HOCHBAU } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import {
  appendBezugStatistikmeldung,
  appendAllgemeineAngaben,
  appendAnsprechpartner,
} from "./statistik-helpers.js";
import crypto from "node:crypto";

/**
 * build-0422: statistik.erloscheneBaugenehmigung.0422
 *
 * XSD: xbau-nachrichten-statistik.xsd
 * Statistikmeldung anlaesslich einer erloschenen oder annullierten Baugenehmigung.
 *
 * Pflichtfelder: bezug (BezugStatistikmeldung), allgemeineAngaben, datumErloscheneBaugenehmigung (JahrMonat)
 * Optional: datumAntragstellung (JahrMonat), ansprechpartner
 */
export function buildStatistik0422(params) {
  const nachrichtenUUID = params.nachrichtenUUID ?? crypto.randomUUID();
  const erstellungszeitpunkt = params.erstellungszeitpunkt ?? new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAU, "statistik.erloscheneBaugenehmigung.0422")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0422",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  appendBezugStatistikmeldung(root, params.bezug);
  appendAllgemeineAngaben(root, params.allgemeineAngaben);

  root.ele(NS_XBAU, "datumErloscheneBaugenehmigung").txt(params.datumErloscheneBaugenehmigung);

  if (params.datumAntragstellung) {
    root.ele(NS_XBAU, "datumAntragstellung").txt(params.datumAntragstellung);
  }

  if (params.ansprechpartner) {
    appendAnsprechpartner(root, params.ansprechpartner);
  }

  return doc.end({ prettyPrint: true });
}
