import { XMLParser } from "fast-xml-parser";
import type { XBauNachrichtenkopf, XBauBezug, Parsed0200 } from "./types";

/**
 * XBau XML-Parser (PROJ-7, ADR-015)
 *
 * Parst eingehende XBau-Nachrichten mit fast-xml-parser.
 * Extrahiert Nachrichtenkopf, bezug-Element und fachliche Daten.
 */

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  parseTagValue: false, // Wichtig: "0200" als String behalten, nicht als Zahl 200 parsen
  isArray: (_name: string, jpath: string | unknown) => {
    const jp = typeof jpath === "string" ? jpath : "";
    return jp.includes("befundliste") || jp.includes("anlagen");
  },
});

/** Parst rohes XML in ein JS-Objekt */
export function parseRawXml(xml: string): Record<string, unknown> {
  return xmlParser.parse(xml) as Record<string, unknown>;
}

/** Erkennt den Nachrichtentyp aus dem Root-Element */
export function detectNachrichtentyp(parsed: Record<string, unknown>): string | null {
  const rootKeys = Object.keys(parsed).filter((k) => !k.startsWith("?"));
  if (rootKeys.length === 0) return null;

  const rootTag = rootKeys[0];
  // XBau Root-Tags: z.B. "xbau:baugenehmigung.antrag.0200"
  const match = rootTag.match(/\.(\d{4})$/);
  if (match) return match[1];

  // Alternativ ohne Namespace-Prefix
  const matchSimple = rootTag.match(/(\d{4})$/);
  return matchSimple ? matchSimple[1] : null;
}

/** Extrahiert den Nachrichtenkopf (G2G) */
export function extractNachrichtenkopf(
  parsed: Record<string, unknown>
): XBauNachrichtenkopf | null {
  const root = getRoot(parsed);
  if (!root) return null;

  const kopf = findElement(root, "nachrichtenkopf");
  if (!kopf) return null;

  const ident = findElement(kopf, "identifikation.nachricht") ?? findElement(kopf, "identifikation");

  return {
    nachrichtenUUID: getTextValue(ident, "nachrichtenUUID") ?? "",
    nachrichtentyp: getTextValue(ident, "nachrichtentyp") ?? detectNachrichtentyp(parsed) ?? "",
    erstellungszeitpunkt: getTextValue(ident, "erstellungszeitpunkt") ?? "",
    autor: getTextValue(findElement(kopf, "autor"), "name") ?? getTextValue(kopf, "autor") ?? undefined,
    leser: getTextValue(findElement(kopf, "leser"), "name") ?? getTextValue(kopf, "leser") ?? undefined,
  };
}

/** Extrahiert das bezug-Element für Nachrichtenkorrelation */
export function extractBezug(parsed: Record<string, unknown>): XBauBezug {
  const root = getRoot(parsed);
  if (!root) return {};

  const bezug = findElement(root, "bezug");
  if (!bezug) return {};

  const bezugNachricht = findElement(bezug, "bezugNachricht");

  return {
    referenz: getTextValue(bezug, "referenz") ?? undefined,
    vorgang: getTextValue(bezug, "vorgang") ?? undefined,
    bezugNachricht: bezugNachricht
      ? {
          nachrichtenUUID: getTextValue(bezugNachricht, "nachrichtenUUID") ?? "",
          nachrichtentyp: getTextValue(bezugNachricht, "nachrichtentyp") ?? "",
          erstellungszeitpunkt: getTextValue(bezugNachricht, "erstellungszeitpunkt") ?? "",
        }
      : undefined,
  };
}

/** Parst eine 0200-Bauantragsnachricht */
export function parse0200(parsed: Record<string, unknown>): Parsed0200 | null {
  const kopf = extractNachrichtenkopf(parsed);
  if (!kopf) return null;

  const root = getRoot(parsed);
  if (!root) return null;

  const bezug = extractBezug(parsed);

  // Bauherr extrahieren
  const bauherr = findElement(root, "bauherr") ?? findElement(root, "antragsteller");
  const bauherrName =
    getTextValue(bauherr, "familienname") ??
    getTextValue(bauherr, "name") ??
    getTextValue(bauherr, "bezeichnung") ??
    "";

  const bauherrAnschrift =
    getTextValue(findElement(bauherr, "anschrift"), "strasse") ??
    getTextValue(bauherr, "anschrift") ??
    undefined;

  // Grundstück
  const grundstueck = findElement(root, "grundstueck") ?? findElement(root, "baugrundstück") ?? findElement(root, "bauGrundstueck");
  const adresse = getTextValue(grundstueck, "strasse") ?? getTextValue(grundstueck, "anschrift") ?? undefined;
  const flurstueck = getTextValue(grundstueck, "flurstueck") ?? getTextValue(grundstueck, "flurstueckskennzeichen") ?? undefined;
  const gemarkung = getTextValue(grundstueck, "gemarkung") ?? undefined;

  // Verfahrensart
  const verfahrensartCode = getTextValue(root, "verfahrensart") ?? undefined;

  // Bezeichnung
  const bezeichnung =
    getTextValue(root, "bezeichnung") ??
    getTextValue(root, "vorhabenbezeichnung") ??
    getTextValue(findElement(root, "bauvorhaben"), "bezeichnung") ??
    undefined;

  return {
    nachrichtenkopf: kopf,
    bezug,
    bauherr: { name: bauherrName, anschrift: bauherrAnschrift },
    grundstueck: { adresse, flurstueck, gemarkung },
    verfahrensartCode,
    bezeichnung,
  };
}

// -- Hilfsfunktionen --

function getRoot(parsed: Record<string, unknown>): Record<string, unknown> | null {
  const rootKeys = Object.keys(parsed).filter((k) => !k.startsWith("?"));
  if (rootKeys.length === 0) return null;
  const rootVal = parsed[rootKeys[0]];
  return typeof rootVal === "object" && rootVal !== null ? (rootVal as Record<string, unknown>) : null;
}

function findElement(
  obj: Record<string, unknown> | null | undefined,
  name: string
): Record<string, unknown> | null {
  if (!obj) return null;
  // Direkt oder mit Namespace-Prefix
  for (const key of Object.keys(obj)) {
    const localName = key.includes(":") ? key.split(":").pop()! : key;
    if (localName === name || localName.toLowerCase() === name.toLowerCase()) {
      const val = obj[key];
      return typeof val === "object" && val !== null ? (val as Record<string, unknown>) : null;
    }
  }
  return null;
}

function getTextValue(
  obj: Record<string, unknown> | null | undefined,
  name: string
): string | null {
  if (!obj) return null;
  for (const key of Object.keys(obj)) {
    const localName = key.includes(":") ? key.split(":").pop()! : key;
    if (localName === name || localName.toLowerCase() === name.toLowerCase()) {
      const val = obj[key];
      if (typeof val === "string") return val;
      if (typeof val === "number") return String(val);
      // Verschachteltes Element mit Text-Content
      if (typeof val === "object" && val !== null && "#text" in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>)["#text"]);
      }
      return null;
    }
  }
  return null;
}
