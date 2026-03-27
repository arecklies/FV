import {
  NS_XBAU,
  NS_XBAUK,
  NS_BN_G2G,
  PRODUKT_NAME,
  PRODUKT_HERSTELLER,
  PRODUKT_VERSION,
  STANDARD_HOCHBAU,
  VERSION_HOCHBAU,
  CODELISTE,
} from "./namespaces";
import {
  createXmlDocument,
  appendNachrichtenkopf,
  type Behoerde,
} from "./nachrichtenkopf";

/**
 * build-0201: Formelle Pruefung (PROJ-7, US-2, FA-9)
 *
 * XSD: xbau-nachrichten-baugenehmigung.xsd -> baugenehmigung.formellePruefung.0201
 * Extends: Nachricht.G2G
 * Struktur:
 *   - nachrichtenkopf.g2g (unqualified, Kernmodul)
 *   - bezug (xbauk:BezugErweitert, unqualified children)
 *   - antragVollstaendig (xs:boolean)
 *   - befundFrist (optional, nur bei antragVollstaendig=false)
 *     -> befundliste (xbau:BefundlisteFormell)
 *       -> befund (1..n)
 *         -> artDesBefundes (Code.FormelleBefundeArt: code + listURI + listVersionID)
 *         -> beschreibung (Text)
 *     -> frist (optional, xs:date)
 *   - unterlagenAntragVollstaendig (optional, nur bei antragVollstaendig=true)
 *     -> genehmigungsdatum
 *       -> spaetestesGenehmigungsdatum (xs:date, Pflicht)
 *   - anschreiben (optional, xbauk:Text)
 *
 * Namespace-Qualifizierung: Fachmodul (xbau) -> elementFormDefault="qualified"
 * Alle Elemente der 0201 bekommen xbau:-Prefix.
 * Kernmodul-Subelemente (nachrichtenkopf.g2g) sind unqualified.
 */

export interface Build0201Params {
  /** Ist der Antrag vollstaendig? */
  antragVollstaendig: boolean;
  /** Befundliste (Freitext je Befund), nur bei antragVollstaendig=false */
  befundliste?: string[];
  /** Nachforderungsfrist als Datum (YYYY-MM-DD), nur bei antragVollstaendig=false */
  fristDatum?: string;
  /** Spaetestes Genehmigungsdatum (YYYY-MM-DD), nur bei antragVollstaendig=true */
  spaetestesGenehmigungsdatum?: string;
  /** Optionales Anschreiben */
  anschreiben?: string;
  /** UUID der Bezugsnachricht (typischerweise 0200 Bauantrag) */
  bezugNachrichtenUuid: string;
  /** Nachrichtentyp der Bezugsnachricht */
  bezugNachrichtentyp: string;
  /** Erstellungszeitpunkt der Bezugsnachricht */
  bezugErstellungszeit: string;
  /** Optional: Aktenzeichen */
  aktenzeichen?: string;
  /** Optional: Referenz-UUID */
  referenzUuid?: string;
  /** Absender (Bauaufsicht) */
  autor: Behoerde;
  /** Empfaenger (Antragsteller/Entwurfsverfasser) */
  leser: Behoerde;
}

/**
 * Generiert eine XBau-Nachricht 0201 (Ergebnis der formellen Pruefung).
 *
 * Fachmodul-Nachricht: Root-Element und alle Kinder im xbau-Namespace (qualified).
 * Kernmodul-Elemente (nachrichtenkopf.g2g, bezug) sind unqualified.
 */
export function build0201(params: Build0201Params): string {
  const nachrichtenUUID = globalThis.crypto.randomUUID();
  const erstellungszeitpunkt = new Date().toISOString();

  const doc = createXmlDocument();

  // Root-Element im Fachmodul-Namespace (qualified)
  const root = doc
    .ele(NS_XBAU, "baugenehmigung.formellePruefung.0201")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  // Nachrichtenkopf (unqualified, Kernmodul)
  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0201",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  // bezug (BezugErweitert - declared in Fachmodul, type from Kernmodul)
  // bezug itself is qualified (xbau:), but children of BezugErweitert are unqualified
  // because Kernmodul has elementFormDefault="unqualified"
  const bezug = root.ele(NS_XBAU, "bezug");
  if (params.referenzUuid) {
    bezug.ele("", "referenz").txt(params.referenzUuid);
  }
  if (params.aktenzeichen) {
    bezug.ele("", "vorgang").txt(params.aktenzeichen);
  }
  // bezugNachricht hat Typ xbau:Identifikation.Nachricht (restriction von bn-uq-g2g)
  // Kinder im bn-g2g Namespace, code innerhalb nachrichtentyp ist unqualified
  const bezugNachricht = bezug.ele("", "bezugNachricht");
  bezugNachricht.ele(NS_BN_G2G, "nachrichtenUUID").txt(params.bezugNachrichtenUuid);
  const bnTyp = bezugNachricht
    .ele(NS_BN_G2G, "nachrichtentyp")
    .att("listURI", CODELISTE.xbauNachrichten.listURI)
    .att("listVersionID", CODELISTE.xbauNachrichten.listVersionID);
  bnTyp.ele("", "code").txt(params.bezugNachrichtentyp);
  bezugNachricht
    .ele(NS_BN_G2G, "erstellungszeitpunkt")
    .txt(params.bezugErstellungszeit);

  // antragVollstaendig (xs:boolean)
  root
    .ele(NS_XBAU, "antragVollstaendig")
    .txt(params.antragVollstaendig ? "true" : "false");

  // befundFrist (nur bei antragVollstaendig=false)
  if (!params.antragVollstaendig && params.befundliste && params.befundliste.length > 0) {
    const befundFrist = root.ele(NS_XBAU, "befundFrist");

    // befundliste (BefundlisteFormell)
    const befundliste = befundFrist.ele(NS_XBAU, "befundliste");
    for (const beschreibung of params.befundliste) {
      const befund = befundliste.ele(NS_XBAU, "befund");
      // artDesBefundes - Kernmodul-Code (unqualified in xbau-codes.xsd: form="unqualified")
      const artEl = befund
        .ele("", "artDesBefundes")
        .att("listURI", CODELISTE.formelleBefundeArt.listURI)
        .att("listVersionID", CODELISTE.formelleBefundeArt.listVersionID);
      artEl.ele("", "code").txt("sonstiges");
      befund.ele("", "beschreibung").txt(beschreibung);
    }

    // frist (optional, xs:date)
    if (params.fristDatum) {
      befundFrist.ele(NS_XBAU, "frist").txt(params.fristDatum);
    }
  }

  // unterlagenAntragVollstaendig (nur bei antragVollstaendig=true)
  if (params.antragVollstaendig) {
    const unterlagen = root.ele(NS_XBAU, "unterlagenAntragVollstaendig");
    // genehmigungsdatum (Pflicht in UnterlagenAntragVollstaendig)
    const genDatum = unterlagen.ele(NS_XBAU, "genehmigungsdatum");
    // spaetestesGenehmigungsdatum (Pflicht)
    genDatum
      .ele(NS_XBAU, "spaetestesGenehmigungsdatum")
      .txt(params.spaetestesGenehmigungsdatum ?? new Date().toISOString().split("T")[0]);
  }

  // anschreiben (optional, xbauk:Text = Sequenz von textabsatz-Elementen)
  if (params.anschreiben) {
    const anschreiben = root.ele(NS_XBAU, "anschreiben");
    const absaetze = params.anschreiben.split("\n").filter(Boolean);
    // textabsatz ist unqualified (Kernmodul elementFormDefault="unqualified")
    for (const absatz of absaetze) {
      anschreiben.ele("", "textabsatz").txt(absatz);
    }
  }

  return doc.end({ prettyPrint: true });
}
