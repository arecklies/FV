import { NS_XBAU, NS_XBAUK, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_HOCHBAU, VERSION_HOCHBAU } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import {
  appendBezugErweitert,
  appendAllgemeineAngabenDatenBauvorhaben,
  appendAnsprechpartnerMitEinwilligung,
} from "./statistik-helpers.js";
import crypto from "node:crypto";

/**
 * build-0420: statistik.datenBauvorhaben.0420
 *
 * XSD: xbau-nachrichten-statistik.xsd
 * Statistiknachricht vom Bauvorhaben an die Bauaufsichtsbehoerde.
 * Stellt die statistikrelevanten Daten des Bauvorhabens bereit.
 *
 * Pflichtfelder: bezug (BezugErweitert), allgemeineAngaben, bauvorhabenGebaeude
 * Optional: ansprechpartner (AnsprechpartnerMitEinwilligung)
 */
export function buildStatistik0420(params) {
  const nachrichtenUUID = params.nachrichtenUUID ?? crypto.randomUUID();
  const erstellungszeitpunkt = params.erstellungszeitpunkt ?? new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAU, "statistik.datenBauvorhaben.0420")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0420",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  appendBezugErweitert(root, params.bezug);

  appendAllgemeineAngabenDatenBauvorhaben(root, params.allgemeineAngaben);

  // bauvorhabenGebaeude — inline complexType with datenEinzelnesGebaeude (unbounded)
  const bvg = root.ele(NS_XBAU, "bauvorhabenGebaeude");
  const gebaeudeList = Array.isArray(params.bauvorhabenGebaeude)
    ? params.bauvorhabenGebaeude
    : [params.bauvorhabenGebaeude];
  for (const geb of gebaeudeList) {
    const deg = bvg.ele(NS_XBAU, "datenEinzelnesGebaeude");
    if (geb.lageGebaeude) {
      deg.ele(NS_XBAU, "lageGebaeude");
    }
    if (geb.identifikationGebaeude) {
      const ig = deg.ele(NS_XBAU, "identifikationGebaeude");
      ig.ele(NS_XBAU, "uuidGebaeude").txt(geb.identifikationGebaeude.uuidGebaeude);
      if (geb.identifikationGebaeude.gebaeudenummer != null) {
        ig.ele(NS_XBAU, "gebaeudenummer").txt(String(geb.identifikationGebaeude.gebaeudenummer));
      }
    }
  }

  if (params.ansprechpartner) {
    appendAnsprechpartnerMitEinwilligung(root, params.ansprechpartner);
  }

  return doc.end({ prettyPrint: true });
}
