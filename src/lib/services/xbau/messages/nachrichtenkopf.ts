import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import {
  CODELISTE,
} from "./namespaces";

/**
 * Nachrichtenkopf-Builder (PROJ-7, ADR-004)
 *
 * Baut den G2G-Nachrichtenkopf als unqualifiziertes Element (Kernmodul).
 * Struktur aus XSD: xbauk:Nachrichtenkopf.G2G
 *   -> identifikation.nachricht (xbauk:Identifikation.Nachricht)
 *     -> nachrichtenUUID
 *     -> nachrichtentyp (Code mit listURI + listVersionID)
 *     -> erstellungszeitpunkt
 *   -> leser (BehoerdeType: verzeichnisdienst, kennung, name)
 *   -> autor (BehoerdeType: verzeichnisdienst, kennung, name)
 */

export interface Behoerde {
  verzeichnisdienst: string;
  kennung: string;
  name: string;
}

export interface NachrichtenkopfParams {
  nachrichtenUUID: string;
  nachrichtentyp: string;
  erstellungszeitpunkt: string;
  autor: Behoerde;
  leser: Behoerde;
  /** Ob die Nachrichtentyp-Codeliste die Kernmodul- oder Hochbau-Codeliste ist */
  codeliste?: "kernmodul" | "hochbau";
}

/**
 * Fuegt den Nachrichtenkopf als Kind-Element an den uebergebenen XML-Knoten an.
 * Alle Elemente sind unqualified (kein Namespace-Prefix), da
 * elementFormDefault="unqualified" im Kernmodul-Schema gilt.
 *
 * Wenn der Parent-Knoten in einem qualifizierten Namespace liegt (z.B. xbau),
 * wird der Nachrichtenkopf mit explizitem Empty-Namespace erzeugt,
 * sodass xmlns="" gesetzt wird (wie in der Referenz-XML).
 */
export function appendNachrichtenkopf(
  parent: XMLBuilder,
  params: NachrichtenkopfParams
): void {
  const codelist =
    params.codeliste === "hochbau"
      ? CODELISTE.xbauNachrichten
      : CODELISTE.kernmodulNachrichten;

  // Bei Fachmodul-Nachrichten (0201 etc.) muss der Nachrichtenkopf
  // die qualifizierte Namespace-Umgebung verlassen (xmlns="").
  // Bei Kernmodul-Nachrichten (1100, 1180) sind wir bereits im
  // unqualified Kontext.
  const useEmptyNs = params.codeliste === "hochbau";
  const eleNs = (p: XMLBuilder, name: string) =>
    useEmptyNs ? p.ele("", name) : p.ele(name);

  const kopf = eleNs(parent, "nachrichtenkopf.g2g");

  // identifikation.nachricht
  const ident = eleNs(kopf, "identifikation.nachricht");
  eleNs(ident, "nachrichtenUUID").txt(params.nachrichtenUUID);
  const nachrichtentyp = eleNs(ident, "nachrichtentyp")
    .att("listURI", codelist.listURI)
    .att("listVersionID", codelist.listVersionID);
  eleNs(nachrichtentyp, "code").txt(params.nachrichtentyp);
  eleNs(ident, "erstellungszeitpunkt").txt(params.erstellungszeitpunkt);

  // leser
  appendBehoerde(kopf, "leser", params.leser, useEmptyNs);

  // autor
  appendBehoerde(kopf, "autor", params.autor, useEmptyNs);
}

function appendBehoerde(
  parent: XMLBuilder,
  elementName: string,
  behoerde: Behoerde,
  useEmptyNs = false
): void {
  const eleNs = (p: XMLBuilder, name: string) =>
    useEmptyNs ? p.ele("", name) : p.ele(name);

  const el = eleNs(parent, elementName);
  const vz = eleNs(el, "verzeichnisdienst")
    .att("listURI", CODELISTE.verzeichnisdienst.listURI)
    .att("listVersionID", CODELISTE.verzeichnisdienst.listVersionID);
  eleNs(vz, "code").txt(behoerde.verzeichnisdienst);
  eleNs(el, "kennung").txt(behoerde.kennung);
  eleNs(el, "name").txt(behoerde.name);
}

/**
 * Hilfsfunktion: Erstellt ein xmlbuilder2-Dokument mit XML-Deklaration.
 */
export function createXmlDocument(): XMLBuilder {
  return create({ version: "1.0", encoding: "UTF-8" });
}
