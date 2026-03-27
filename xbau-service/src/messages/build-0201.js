import { NS_XBAU, NS_XBAUK, NS_BN_G2G, PRODUKT_NAME, PRODUKT_HERSTELLER, PRODUKT_VERSION, STANDARD_HOCHBAU, VERSION_HOCHBAU, CODELISTE } from "./namespaces.js";
import { createXmlDocument, appendNachrichtenkopf } from "./nachrichtenkopf.js";
import crypto from "node:crypto";

/**
 * build-0201: Formelle Pruefung
 * Isolierte Kopie fuer den XBau-Service Worker
 */
export function build0201(params) {
  const nachrichtenUUID = crypto.randomUUID();
  const erstellungszeitpunkt = new Date().toISOString();

  const doc = createXmlDocument();
  const root = doc
    .ele(NS_XBAU, "baugenehmigung.formellePruefung.0201")
    .att("xmlns:xbau", NS_XBAU)
    .att("xmlns:xbauk", NS_XBAUK)
    .att("produkt", PRODUKT_NAME)
    .att("produkthersteller", PRODUKT_HERSTELLER)
    .att("produktversion", PRODUKT_VERSION)
    .att("standard", STANDARD_HOCHBAU)
    .att("version", VERSION_HOCHBAU);

  appendNachrichtenkopf(root, {
    nachrichtenUUID,
    nachrichtentyp: "0201",
    erstellungszeitpunkt,
    autor: params.autor,
    leser: params.leser,
    codeliste: "hochbau",
  });

  const bezug = root.ele(NS_XBAU, "bezug");
  if (params.referenzUuid) bezug.ele("", "referenz").txt(params.referenzUuid);
  if (params.aktenzeichen) bezug.ele("", "vorgang").txt(params.aktenzeichen);
  // bezugNachricht hat Typ xbau:Identifikation.Nachricht (restriction von bn-uq-g2g)
  // Kinder-Elemente: nachrichtenUUID, nachrichtentyp, erstellungszeitpunkt im bn-g2g Namespace
  // ABER: code innerhalb nachrichtentyp ist unqualified (kein Namespace)
  const bezugNachricht = bezug.ele("", "bezugNachricht");
  bezugNachricht.ele(NS_BN_G2G, "nachrichtenUUID").txt(params.bezugNachrichtenUuid);
  const bnTyp = bezugNachricht.ele(NS_BN_G2G, "nachrichtentyp")
    .att("listURI", CODELISTE.xbauNachrichten.listURI)
    .att("listVersionID", CODELISTE.xbauNachrichten.listVersionID);
  bnTyp.ele("", "code").txt(params.bezugNachrichtentyp);
  bezugNachricht.ele(NS_BN_G2G, "erstellungszeitpunkt").txt(params.bezugErstellungszeitpunkt ?? params.bezugErstellungszeit ?? "");

  root.ele(NS_XBAU, "antragVollstaendig").txt(params.antragVollstaendig ? "true" : "false");

  if (!params.antragVollstaendig && params.befundliste?.length > 0) {
    const befundFrist = root.ele(NS_XBAU, "befundFrist");
    const befundliste = befundFrist.ele(NS_XBAU, "befundliste");
    for (const beschreibung of params.befundliste) {
      const befund = befundliste.ele(NS_XBAU, "befund");
      const artEl = befund.ele("", "artDesBefundes")
        .att("listURI", CODELISTE.formelleBefundeArt.listURI)
        .att("listVersionID", CODELISTE.formelleBefundeArt.listVersionID);
      artEl.ele("", "code").txt("sonstiges");
      befund.ele("", "beschreibung").txt(beschreibung);
    }
    if (params.fristDatum) befundFrist.ele(NS_XBAU, "frist").txt(params.fristDatum);
  }

  if (params.antragVollstaendig) {
    const unterlagen = root.ele(NS_XBAU, "unterlagenAntragVollstaendig");
    const genDatum = unterlagen.ele(NS_XBAU, "genehmigungsdatum");
    genDatum.ele(NS_XBAU, "spaetestesGenehmigungsdatum")
      .txt(params.spaetestesGenehmigungsdatum ?? new Date().toISOString().split("T")[0]);
  }

  // anschreiben ist xbauk:Text = Sequenz von textabsatz-Elementen (kein Freitext)
  if (params.anschreiben) {
    const anschreiben = root.ele(NS_XBAU, "anschreiben");
    const absaetze = typeof params.anschreiben === "string"
      ? params.anschreiben.split("\n").filter(Boolean)
      : Array.isArray(params.anschreiben) ? params.anschreiben : [String(params.anschreiben)];
    // textabsatz ist unqualified (Kernmodul elementFormDefault="unqualified")
    for (const absatz of absaetze) {
      anschreiben.ele("", "textabsatz").txt(absatz);
    }
  }

  return doc.end({ prettyPrint: true });
}
