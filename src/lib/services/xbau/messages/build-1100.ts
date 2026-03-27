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
 * build-1100: Rueckweisungsnachricht G2G (PROJ-7, FA-11)
 *
 * XSD: xbau-kernmodul-prozessnachrichten.xsd -> prozessnachrichten.rueckweisung.G2G.1100
 * Struktur:
 *   - nachrichtenkopf.g2g (unqualified, Kernmodul)
 *   - anbindungFachverfahren (optional, nicht implementiert)
 *   - rueckweisungDaten (xbauk:Rueckweisung)
 *     -> rueckweisungsgrund (1..n, xbauk:Rueckweisungsgrund)
 *       -> grund (Code.XBau.Fehlerkennzahl: code + listURI + listVersionID)
 *       -> fehlertext (optional, din91379:datatypeC)
 *     -> idNachricht (Identifikation.NachrichtType)
 *       -> nachrichtenUUID
 *       -> nachrichtentyp (Code)
 *       -> erstellungszeitpunkt
 *     -> nachricht (xs:base64Binary - abgewiesene Nachricht ohne Attachments)
 */

export interface Build1100Params {
  /** Fehlerkennzahl aus XBau-Codeliste (X/V/S/A-Serie) */
  fehlerkennzahl: string;
  /** Freitext-Fehlerbeschreibung */
  fehlertext?: string;
  /** Die abgewiesene Nachricht als Base64-kodiertes XML */
  abgewieseneNachrichtBase64: string;
  /** UUID der abgewiesenen Nachricht */
  abgewieseneNachrichtenUUID: string;
  /** Nachrichtentyp der abgewiesenen Nachricht (z.B. "0200") */
  abgewiesenerNachrichtentyp: string;
  /** Erstellungszeitpunkt der abgewiesenen Nachricht */
  abgewieseneErstellungszeit: string;
  /** Absender der Rueckweisung (wir) */
  autor: Behoerde;
  /** Empfaenger der Rueckweisung (Absender der abgewiesenen Nachricht) */
  leser: Behoerde;
}

/**
 * Generiert eine XBau-Rueckweisungsnachricht 1100.
 *
 * Kernmodul-Nachricht: Root-Element im xbauk-Namespace,
 * Kinder sind unqualified (elementFormDefault="unqualified").
 */
export function build1100(params: Build1100Params): string {
  const nachrichtenUUID = globalThis.crypto.randomUUID();
  const erstellungszeitpunkt = new Date().toISOString();

  const doc = createXmlDocument();

  // Root-Element im Kernmodul-Namespace (qualified)
  const root = doc
    .ele(NS_XBAUK, "prozessnachrichten.rueckweisung.G2G.1100")
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_KERNMODUL)
    .att("version", VERSION_KERNMODUL);

  // Nachrichtenkopf (unqualified children)
  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "1100",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "kernmodul",
  });

  // rueckweisungDaten (xbauk:Rueckweisung)
  const rueckweisungDaten = root.ele("rueckweisungDaten");

  // rueckweisungsgrund (1..n)
  const grund = rueckweisungDaten.ele("rueckweisungsgrund");
  grund
    .ele("grund")
    .att("listURI", CODELISTE.fehlerkennzahlen.listURI)
    .att("listVersionID", CODELISTE.fehlerkennzahlen.listVersionID)
    .ele("code")
    .txt(params.fehlerkennzahl);
  if (params.fehlertext) {
    grund.ele("fehlertext").txt(params.fehlertext);
  }

  // idNachricht (Identifikation.NachrichtType der abgewiesenen Nachricht)
  const idNachricht = rueckweisungDaten.ele("idNachricht");
  idNachricht.ele("nachrichtenUUID").txt(params.abgewieseneNachrichtenUUID);
  idNachricht
    .ele("nachrichtentyp")
    .att("listURI", CODELISTE.kernmodulNachrichten.listURI)
    .att("listVersionID", CODELISTE.kernmodulNachrichten.listVersionID)
    .ele("code")
    .txt(params.abgewiesenerNachrichtentyp);
  idNachricht
    .ele("erstellungszeitpunkt")
    .txt(params.abgewieseneErstellungszeit);

  // nachricht (xs:base64Binary)
  rueckweisungDaten
    .ele("nachricht")
    .txt(params.abgewieseneNachrichtBase64);

  return doc.end({ prettyPrint: true });
}
