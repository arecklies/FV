import { NS_XBAUK, NS_BN_G2G, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_KERNMODUL, VERSION_KERNMODUL, CODELISTE } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import crypto from "node:crypto";

/**
 * build-1180: Generische Eingangsquittung
 *
 * Kernmodul: elementFormDefault="unqualified" — alle Kinder-Elemente
 * muessen im leeren Namespace stehen (ele("", name)).
 */
export function build1180(params) {
  const nachrichtenUUID = crypto.randomUUID();
  const erstellungszeitpunkt = new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAUK, "prozessnachrichten.generischeQuittierungEingang.1180")
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_KERNMODUL)
    .att("version", VERSION_KERNMODUL);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "1180",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "kernmodul",
  });

  // Alle Kinder unqualified (leerer Namespace)
  const bezug = root.ele("", "bezug");
  if (params.referenzUuid) bezug.ele("", "referenz").txt(params.referenzUuid);
  if (params.aktenzeichen) bezug.ele("", "vorgang").txt(params.aktenzeichen);
  // bezugNachricht-Kinder im Basisnachricht-Namespace (Identifikation.NachrichtType)
  // code innerhalb nachrichtentyp ist unqualified
  const bezugNachricht = bezug.ele("", "bezugNachricht");
  bezugNachricht.ele(NS_BN_G2G, "nachrichtenUUID").txt(params.quittierteNachrichtenUUID ?? params.bezugNachrichtenUuid);
  bezugNachricht.ele(NS_BN_G2G, "nachrichtentyp")
    .att("listURI", CODELISTE.kernmodulNachrichten.listURI)
    .att("listVersionID", CODELISTE.kernmodulNachrichten.listVersionID)
    .ele("", "code").txt(params.quittierterNachrichtentyp ?? params.bezugNachrichtentyp);
  bezugNachricht.ele(NS_BN_G2G, "erstellungszeitpunkt").txt(params.quittierteErstellungszeit ?? params.bezugErstellungszeit ?? "");

  root.ele("", "nachrichtentyp")
    .att("listURI", CODELISTE.quittierteNachricht.listURI)
    .att("listVersionID", CODELISTE.quittierteNachricht.listVersionID)
    .ele("", "code").txt(params.quittierterNachrichtentyp ?? params.bezugNachrichtentyp);

  return doc.end({ prettyPrint: true });
}
