import {
  NS_XBAUK,
  PRODUKT_NAME,
  PRODUKT_HERSTELLER,
  PRODUKT_VERSION,
  STANDARD_KERNMODUL,
  VERSION_KERNMODUL,
  CODELISTE,
} from "./namespaces";
import {
  createXmlDocument,
  appendNachrichtenkopf,
  type Behoerde,
} from "./nachrichtenkopf";

/**
 * build-1180: Generische Eingangsquittung (PROJ-7, FA-12)
 *
 * XSD: xbau-kernmodul-prozessnachrichten.xsd -> prozessnachrichten.generischeQuittierungEingang.1180
 * Struktur:
 *   - nachrichtenkopf.g2g (unqualified, Kernmodul)
 *   - bezug (xbauk:BezugErweitert, extends Bezug)
 *     -> referenz (optional, UUID)
 *     -> vorgang (optional, Aktenzeichen)
 *     -> bezugNachricht (optional, Identifikation.NachrichtType)
 *       -> nachrichtenUUID
 *       -> nachrichtentyp (Code)
 *       -> erstellungszeitpunkt
 *     -> anbindungFachverfahren (optional, nicht implementiert)
 *   - nachrichtentyp (Code.XBau-QuittierteNachricht)
 *   - information (optional, Text)
 */

export interface Build1180Params {
  /** UUID der quittierten Nachricht */
  quittierteNachrichtenUUID: string;
  /** Nachrichtentyp der quittierten Nachricht (z.B. "0200") */
  quittierterNachrichtentyp: string;
  /** Erstellungszeitpunkt der quittierten Nachricht */
  quittierteErstellungszeit: string;
  /** Optional: Aktenzeichen des Vorgangs */
  aktenzeichen?: string;
  /** Optional: Referenz-UUID (Portal-UUID) */
  referenzUuid?: string;
  /** Absender der Quittung (wir) */
  autor: Behoerde;
  /** Empfaenger der Quittung (Absender der quittierten Nachricht) */
  leser: Behoerde;
}

/**
 * Generiert eine XBau-Eingangsquittung 1180.
 *
 * Kernmodul-Nachricht: Root-Element im xbauk-Namespace,
 * Kinder sind unqualified (elementFormDefault="unqualified").
 */
export function build1180(params: Build1180Params): string {
  const nachrichtenUUID = globalThis.crypto.randomUUID();
  const erstellungszeitpunkt = new Date().toISOString();

  const doc = createXmlDocument();

  const root = doc
    .ele(NS_XBAUK, "prozessnachrichten.generischeQuittierungEingang.1180")
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_KERNMODUL)
    .att("version", VERSION_KERNMODUL);

  // Nachrichtenkopf
  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "1180",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "kernmodul",
  });

  // bezug (BezugErweitert extends Bezug)
  const bezug = root.ele("bezug");
  if (params.referenzUuid) {
    bezug.ele("referenz").txt(params.referenzUuid);
  }
  if (params.aktenzeichen) {
    bezug.ele("vorgang").txt(params.aktenzeichen);
  }
  // bezugNachricht (auf die quittierte Nachricht)
  const bezugNachricht = bezug.ele("bezugNachricht");
  bezugNachricht.ele("nachrichtenUUID").txt(params.quittierteNachrichtenUUID);
  bezugNachricht
    .ele("nachrichtentyp")
    .att("listURI", CODELISTE.kernmodulNachrichten.listURI)
    .att("listVersionID", CODELISTE.kernmodulNachrichten.listVersionID)
    .ele("code")
    .txt(params.quittierterNachrichtentyp);
  bezugNachricht
    .ele("erstellungszeitpunkt")
    .txt(params.quittierteErstellungszeit);

  // nachrichtentyp (Code.XBau-QuittierteNachricht)
  root
    .ele("nachrichtentyp")
    .att("listURI", CODELISTE.quittierteNachricht.listURI)
    .att("listVersionID", CODELISTE.quittierteNachricht.listVersionID)
    .ele("code")
    .txt(params.quittierterNachrichtentyp);

  return doc.end({ prettyPrint: true });
}
