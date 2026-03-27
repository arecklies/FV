import { NS_XBAUK, NS_BN_G2G, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_KERNMODUL, VERSION_KERNMODUL, CODELISTE } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import crypto from "node:crypto";

/**
 * build-1100: Rueckweisungsnachricht G2G
 *
 * Kernmodul: elementFormDefault="unqualified" — alle Kinder-Elemente
 * muessen im leeren Namespace stehen (ele("", name)).
 */
export function build1100(params) {
  const nachrichtenUUID = crypto.randomUUID();
  const erstellungszeitpunkt = new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAUK, "prozessnachrichten.rueckweisung.G2G.1100")
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_KERNMODUL)
    .att("version", VERSION_KERNMODUL);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "1100",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "kernmodul",
  });

  // Alle Kinder unqualified (leerer Namespace)
  const rueckweisungDaten = root.ele("", "rueckweisungDaten");
  const grund = rueckweisungDaten.ele("", "rueckweisungsgrund");
  grund.ele("", "grund")
    .att("listURI", CODELISTE.fehlerkennzahlen.listURI)
    .att("listVersionID", CODELISTE.fehlerkennzahlen.listVersionID)
    .ele("", "code").txt(params.fehlerkennzahl);
  if (params.fehlertext) grund.ele("", "fehlertext").txt(params.fehlertext);

  // idNachricht hat Typ Identifikation.NachrichtType — Kinder im bn-g2g Namespace, code unqualified
  const idNachricht = rueckweisungDaten.ele("", "idNachricht");
  idNachricht.ele(NS_BN_G2G, "nachrichtenUUID").txt(params.abgewieseneNachrichtenUUID ?? params.bezugNachrichtenUuid);
  idNachricht.ele(NS_BN_G2G, "nachrichtentyp")
    .att("listURI", CODELISTE.kernmodulNachrichten.listURI)
    .att("listVersionID", CODELISTE.kernmodulNachrichten.listVersionID)
    .ele("", "code").txt(params.abgewiesenerNachrichtentyp ?? params.bezugNachrichtentyp);
  idNachricht.ele(NS_BN_G2G, "erstellungszeitpunkt").txt(params.abgewieseneErstellungszeit ?? params.bezugErstellungszeit ?? "");

  rueckweisungDaten.ele("", "nachricht").txt(params.abgewieseneNachrichtBase64 ?? params.abgewieseNeNachrichtBase64);

  return doc.end({ prettyPrint: true });
}
