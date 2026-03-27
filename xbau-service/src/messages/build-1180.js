import { NS_XBAUK, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_KERNMODUL, VERSION_KERNMODUL, CODELISTE } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import crypto from "node:crypto";

/**
 * build-1180: Generische Eingangsquittung
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

  const bezug = root.ele("bezug");
  if (params.referenzUuid) bezug.ele("referenz").txt(params.referenzUuid);
  if (params.aktenzeichen) bezug.ele("vorgang").txt(params.aktenzeichen);
  const bezugNachricht = bezug.ele("bezugNachricht");
  bezugNachricht.ele("nachrichtenUUID").txt(params.quittierteNachrichtenUUID);
  bezugNachricht.ele("nachrichtentyp")
    .att("listURI", CODELISTE.kernmodulNachrichten.listURI)
    .att("listVersionID", CODELISTE.kernmodulNachrichten.listVersionID)
    .ele("code").txt(params.quittierterNachrichtentyp);
  bezugNachricht.ele("erstellungszeitpunkt").txt(params.quittierteErstellungszeit);

  root.ele("nachrichtentyp")
    .att("listURI", CODELISTE.quittierteNachricht.listURI)
    .att("listVersionID", CODELISTE.quittierteNachricht.listVersionID)
    .ele("code").txt(params.quittierterNachrichtentyp);

  return doc.end({ prettyPrint: true });
}
