import { create } from "xmlbuilder2";
import { CODELISTE } from "./namespaces.js";

/**
 * Nachrichtenkopf-Builder (G2G) fuer den XBau-Service
 */

export function appendNachrichtenkopf(parent, params) {
  const codelist =
    params.codeliste === "hochbau"
      ? CODELISTE.xbauNachrichten
      : CODELISTE.kernmodulNachrichten;

  const useEmptyNs = params.codeliste === "hochbau";
  const eleNs = (p, name) => (useEmptyNs ? p.ele("", name) : p.ele(name));

  const kopf = eleNs(parent, "nachrichtenkopf.g2g");

  const ident = eleNs(kopf, "identifikation.nachricht");
  eleNs(ident, "nachrichtenUUID").txt(params.nachrichtenUUID);
  const nachrichtentyp = eleNs(ident, "nachrichtentyp")
    .att("listURI", codelist.listURI)
    .att("listVersionID", codelist.listVersionID);
  eleNs(nachrichtentyp, "code").txt(params.nachrichtentyp);
  eleNs(ident, "erstellungszeitpunkt").txt(params.erstellungszeitpunkt);

  appendBehoerde(kopf, "leser", params.leser, useEmptyNs);
  appendBehoerde(kopf, "autor", params.autor, useEmptyNs);
}

function appendBehoerde(parent, elementName, behoerde, useEmptyNs = false) {
  const eleNs = (p, name) => (useEmptyNs ? p.ele("", name) : p.ele(name));
  const el = eleNs(parent, elementName);
  const vz = eleNs(el, "verzeichnisdienst")
    .att("listURI", CODELISTE.verzeichnisdienst.listURI)
    .att("listVersionID", CODELISTE.verzeichnisdienst.listVersionID);
  eleNs(vz, "code").txt(behoerde.verzeichnisdienst);
  eleNs(el, "kennung").txt(behoerde.kennung);
  eleNs(el, "name").txt(behoerde.name);
}

export function createXmlDocument() {
  return create({ version: "1.0", encoding: "UTF-8" });
}
