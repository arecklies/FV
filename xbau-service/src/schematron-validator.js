/**
 * schematron-validator.js (PROJ-59)
 *
 * Runtime-Validierung eingehender XBau-Nachrichten gegen Schematron-Regeln.
 * Nutzt pre-kompilierte .sef.json-Datei (erstellt durch compile-schematron.js).
 *
 * Saxon-JS wird per Dynamic Import geladen (ADR-015).
 * Die .sef-Datei wird einmalig in Memory gecacht.
 *
 * Performance-Ziel: < 5 Sekunden fuer Validierung einer Nachricht.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEF_PATH = path.resolve(__dirname, "..", "compiled", "xbau-schematron.sef.json");

// Module-Level-Cache fuer Saxon-JS und SEF
/** @type {any} */
let _saxonJS = null;
/** @type {any} */
let _sefDoc = null;

/**
 * Saxon-JS per Dynamic Import laden (ADR-015: kein Top-Level-Import)
 * @returns {Promise<any>}
 */
async function getSaxonJS() {
  if (!_saxonJS) {
    _saxonJS = (await import("saxon-js")).default;
  }
  return _saxonJS;
}

/**
 * SEF-Datei laden und cachen (einmalig)
 * @returns {Promise<any>}
 */
async function getSefDocument() {
  if (!_sefDoc) {
    if (!fs.existsSync(SEF_PATH)) {
      throw new Error(
        `SEF-Datei nicht gefunden: ${SEF_PATH}. ` +
          'Bitte "npm run prebuild:schematron" ausfuehren.'
      );
    }
    const sefContent = fs.readFileSync(SEF_PATH, "utf-8");
    _sefDoc = JSON.parse(sefContent);
  }
  return _sefDoc;
}

/**
 * Cache zuruecksetzen (fuer Tests und XBau-Version-Updates)
 */
export function resetCache() {
  _saxonJS = null;
  _sefDoc = null;
}

/**
 * Fehlerkennzahl-Mapping: Schematron-Regel-ID -> S-Serie-Fehlerkennzahl
 *
 * XBau-Fehlerkennzahlen (S-Serie fuer Schematron-Fehler):
 * - S001: Geschaeftsregel verletzt (allgemein)
 * - S002: Plausibilitaetspruefung fehlgeschlagen
 * - S003: Pflichtfeld fehlt (Schematron-Kontext)
 *
 * Spezifische Mappings basieren auf den Regel-Praefix:
 * - sch-stat-*: Statistik-Regeln
 * - sch-xbau-*: Nachrichtenkopf-/Strukturregeln
 * - sch-anz-*: Anzeige-Regeln
 */
const RULE_PREFIX_TO_FEHLERKENNZAHL = {
  "sch-stat": "S002", // Statistische Plausibilitaetspruefung
  "sch-xbau": "S001", // Strukturelle Geschaeftsregel
  "sch-anz": "S003", // Anzeige-Pflichtfeld
};

/**
 * Fehlerkennzahl aus Schematron-Regel-ID ableiten
 * @param {string} ruleId - z.B. "sch-stat-003", "sch-xbau-001"
 * @returns {string} S-Serie-Fehlerkennzahl
 */
function mapRuleToFehlerkennzahl(ruleId) {
  if (!ruleId) return "S001";
  for (const [prefix, kennzahl] of Object.entries(RULE_PREFIX_TO_FEHLERKENNZAHL)) {
    if (ruleId.startsWith(prefix)) return kennzahl;
  }
  return "S001"; // Fallback: allgemeine Geschaeftsregel
}

/**
 * SVRL-Ergebnis parsen und Fehler extrahieren
 *
 * SVRL (Schematron Validation Report Language) ist das Standard-Ausgabeformat.
 * Fehlgeschlagene Assertions werden als <svrl:failed-assert> gemeldet.
 *
 * @param {string} svrlXml - SVRL-Output als XML-String
 * @returns {Array<{id: string, fehlerkennzahl: string, text: string, location: string, rule: string}>}
 */
function parseSvrlErrors(svrlXml) {
  const errors = [];

  // Beide Varianten: mit und ohne svrl:-Prefix
  const failedAssertRegex =
    /<(?:svrl:)?failed-assert([^>]*)>([\s\S]*?)<\/(?:svrl:)?failed-assert>/gi;

  let match;
  while ((match = failedAssertRegex.exec(svrlXml)) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";

    // Attribute einzeln extrahieren (robust, Reihenfolge egal)
    const idMatch = attrs.match(/\bid="([^"]*)"/);
    const locationMatch = attrs.match(/\blocation="([^"]*)"/);
    const id = idMatch ? idMatch[1] : "";
    const location = locationMatch ? locationMatch[1] : "";

    // Text aus <svrl:text> oder <text> extrahieren
    const textMatch = inner.match(/<(?:svrl:)?text>([\s\S]*?)<\/(?:svrl:)?text>/i);
    const text = textMatch ? textMatch[1].trim() : "";

    errors.push({
      id,
      fehlerkennzahl: mapRuleToFehlerkennzahl(id),
      text,
      location,
      rule: id,
    });
  }

  return errors;
}

/**
 * @typedef {Object} SchematronResult
 * @property {boolean} valid - true wenn keine Schematron-Fehler
 * @property {Array<{id: string, fehlerkennzahl: string, text: string, location: string, rule: string}>} errors
 * @property {number} durationMs - Validierungsdauer in Millisekunden
 * @property {number} ruleCount - Anzahl gepruefter Regeln (aus SVRL)
 */

/**
 * XBau-Nachricht gegen Schematron-Regeln validieren
 *
 * @param {string} xmlString - Die zu validierende XBau-Nachricht als XML-String
 * @returns {Promise<SchematronResult>}
 */
export async function validateSchematron(xmlString) {
  if (!xmlString || typeof xmlString !== "string") {
    throw new Error("xmlString muss ein nicht-leerer String sein");
  }

  const startTime = performance.now();

  const SaxonJS = await getSaxonJS();
  const sefDoc = await getSefDocument();

  let svrlResult;
  try {
    // Saxon-JS Transform: XML -> SVRL (via pre-kompiliertes Schematron-XSLT)
    const result = await SaxonJS.transform(
      {
        stylesheetInternal: sefDoc,
        sourceText: xmlString,
        destination: "serialized",
      },
      "async"
    );

    svrlResult = result.principalResult;
  } catch (err) {
    // Saxon-JS-Fehler: XML-Parsing oder XSLT-Ausfuehrung fehlgeschlagen
    const durationMs = Math.round(performance.now() - startTime);
    return {
      valid: false,
      errors: [
        {
          id: "SAXON-ERROR",
          fehlerkennzahl: "S001",
          text: `Schematron-Validierung fehlgeschlagen: ${err.message}`,
          location: "",
          rule: "SAXON-ERROR",
        },
      ],
      durationMs,
      ruleCount: 0,
    };
  }

  const durationMs = Math.round(performance.now() - startTime);
  const errors = parseSvrlErrors(svrlResult);

  // Anzahl der geprueften Regeln aus SVRL zaehlen (fired-rule Elemente)
  const firedRuleCount = (svrlResult.match(/<(?:svrl:)?fired-rule/gi) || []).length;

  return {
    valid: errors.length === 0,
    errors,
    durationMs,
    ruleCount: firedRuleCount,
  };
}

/**
 * Schematron-Fehler in Rueckweisungs-Parameter (fuer build-1100) konvertieren
 *
 * @param {SchematronResult} result - Ergebnis von validateSchematron()
 * @returns {{fehlerkennzahl: string, fehlertext: string} | null}
 */
export function toRueckweisungParams(result) {
  if (result.valid || result.errors.length === 0) return null;

  // Erste (schwerste) Fehlerkennzahl als Haupt-Fehlerkennzahl
  const primaryError = result.errors[0];

  // Alle Fehlertexte zusammenfassen
  const fehlertext = result.errors
    .map((e, i) => `[${e.fehlerkennzahl}] ${e.id}: ${e.text}`)
    .join("\n");

  return {
    fehlerkennzahl: primaryError.fehlerkennzahl,
    fehlertext: `Schematron-Validierung fehlgeschlagen (${result.errors.length} Fehler, ${result.durationMs}ms):\n${fehlertext}`,
  };
}
