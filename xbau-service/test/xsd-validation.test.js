/**
 * PROJ-58: XBau CI-Pipeline XSD-Validierung
 *
 * Strukturelle Validierung generierter XBau-XMLs gegen XSD-Schemas.
 *
 * Strategie:
 * 1. XML-Wohlgeformtheit (fast-xml-parser)
 * 2. Namespace-Korrektheit (Root-Element, Prefixes)
 * 3. Pflicht-Elemente gemaess XSD-Definition
 * 4. Referenz-XMLs als Regression-Baseline
 * 5. Optional: xmllint wenn in CI verfuegbar
 */

import { XMLParser } from "fast-xml-parser";
import { build0201 } from "../src/messages/build-0201.js";
import { build1100 } from "../src/messages/build-1100.js";
import { build1180 } from "../src/messages/build-1180.js";
import { NS_XBAU, NS_XBAUK } from "../src/messages/namespaces.js";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const XSD_DIR = resolve(PROJECT_ROOT, "Input", "xsd+xsd_dev", "xsd");
const XSD_DEV_DIR = resolve(PROJECT_ROOT, "Input", "xsd+xsd_dev", "xsd_dev");
const REFERENCE_XML_DIR = resolve(PROJECT_ROOT, "Input", "XBau-Testdateien", "2.6");

// --- Shared test fixtures ---

const BEHOERDE_AUTOR = {
  verzeichnisdienst: "psw",
  kennung: "test-bauaufsicht-001",
  name: "Testbauaufsicht",
};

const BEHOERDE_LESER = {
  verzeichnisdienst: "psw",
  kennung: "test-portal-001",
  name: "Testportal",
};

// --- XML Parser for structural validation ---

function createStrictParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: false,
    parseTagValue: false,
    trimValues: true,
    isArray: () => false,
  });
}

/**
 * Validate XML is well-formed by parsing with fast-xml-parser.
 * Throws on malformed XML.
 */
function assertWellFormedXml(xmlString) {
  const parser = createStrictParser();
  const result = parser.parse(xmlString);
  if (!result || typeof result !== "object") {
    throw new Error("XML parsing returned empty or non-object result");
  }
  return result;
}

/**
 * Check that root element matches expected qualified name and namespace.
 */
function assertRootElement(parsed, expectedRootLocal, expectedNsPrefix) {
  const rootKey = expectedNsPrefix
    ? `${expectedNsPrefix}:${expectedRootLocal}`
    : expectedRootLocal;

  const topKeys = Object.keys(parsed).filter((k) => k !== "?xml");
  if (topKeys.length !== 1) {
    throw new Error(
      `Expected exactly 1 root element, found: ${topKeys.join(", ")}`
    );
  }
  if (topKeys[0] !== rootKey) {
    throw new Error(
      `Expected root element '${rootKey}', found '${topKeys[0]}'`
    );
  }
  return parsed[topKeys[0]];
}

/**
 * Check that an XML string declares expected namespace URIs.
 */
function assertNamespaceDeclarations(xmlString, expectedNamespaces) {
  for (const ns of expectedNamespaces) {
    if (!xmlString.includes(ns)) {
      throw new Error(`Missing namespace declaration: ${ns}`);
    }
  }
}

/**
 * Check that required child elements exist at root level (XSD xs:element with no minOccurs="0").
 */
function assertRequiredElements(rootObj, requiredElements, rootName) {
  const missing = [];
  for (const el of requiredElements) {
    // Elements may be namespace-qualified or unqualified
    const found = Object.keys(rootObj).some(
      (k) => k === el || k.endsWith(`:${el}`) || k === `xbau:${el}` || k === `xbauk:${el}`
    );
    if (!found) {
      missing.push(el);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Root '${rootName}' missing required elements: ${missing.join(", ")}`
    );
  }
}

/**
 * Check that XSD attributes on root are present (produkt, produkthersteller, etc.).
 */
function assertRootAttributes(rootObj, requiredAttrs) {
  const missing = [];
  for (const attr of requiredAttrs) {
    const key = `@_${attr}`;
    if (!(key in rootObj)) {
      missing.push(attr);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing root attributes: ${missing.join(", ")}`);
  }
}

/**
 * Try xmllint validation if available. Returns { available, valid, errors }.
 */
function tryXmllintValidation(xmlString, xsdPath) {
  try {
    execSync("which xmllint", { stdio: "pipe" });
  } catch {
    return { available: false, valid: null, errors: null };
  }

  const tmpXml = resolve(__dirname, ".tmp-validate.xml");
  try {
    writeFileSync(tmpXml, xmlString, "utf-8");
    execSync(`xmllint --schema "${xsdPath}" --noout "${tmpXml}"`, {
      stdio: "pipe",
    });
    return { available: true, valid: true, errors: null };
  } catch (err) {
    return { available: true, valid: false, errors: err.stderr?.toString() };
  } finally {
    try {
      unlinkSync(tmpXml);
    } catch {
      // ignore cleanup errors
    }
  }
}

// --- XSD Schema Structure Definitions (derived from XSD files) ---

/**
 * Required elements for baugenehmigung.formellePruefung.0201
 * Source: xbau-nachrichten-baugenehmigung.xsd, line 126-195
 *
 * Nachricht.G2G base type provides: nachrichtenkopf.g2g
 * Extension sequence: bezug, antragVollstaendig, befundFrist?, unterlagenAntragVollstaendig?,
 *                     anschreiben?, angebotFuerAntwortLeser?, anlagen?
 */
const SCHEMA_0201 = {
  rootElement: "baugenehmigung.formellePruefung.0201",
  nsPrefix: "xbau",
  targetNamespace: NS_XBAU,
  requiredNamespaces: [NS_XBAU, NS_XBAUK],
  rootAttributes: ["produkt", "produkthersteller", "produktversion", "standard", "version"],
  requiredElements: ["nachrichtenkopf.g2g", "bezug", "antragVollstaendig"],
  xsdFile: resolve(XSD_DIR, "xbau-nachrichten-baugenehmigung.xsd"),
};

/**
 * Required elements for prozessnachrichten.rueckweisung.G2G.1100
 * Source: xbau-kernmodul-prozessnachrichten.xsd, line 40-67
 *
 * Nachricht.G2G base: nachrichtenkopf.g2g
 * Extension: anbindungFachverfahren?, rueckweisungDaten
 */
const SCHEMA_1100 = {
  rootElement: "prozessnachrichten.rueckweisung.G2G.1100",
  nsPrefix: null, // Kernmodul uses default namespace (xmlns="..."), no prefix
  targetNamespace: NS_XBAUK,
  requiredNamespaces: [NS_XBAUK],
  rootAttributes: ["produkt", "produkthersteller", "produktversion", "standard", "version"],
  requiredElements: ["nachrichtenkopf.g2g", "rueckweisungDaten"],
  xsdFile: resolve(XSD_DEV_DIR, "xbau-kernmodul-prozessnachrichten.xsd"),
};

/**
 * Required elements for prozessnachrichten.generischeQuittierungEingang.1180
 * Source: xbau-kernmodul-prozessnachrichten.xsd, line 420-450
 *
 * Nachricht.G2G base: nachrichtenkopf.g2g
 * Extension: bezug, nachrichtentyp, information?
 */
const SCHEMA_1180 = {
  rootElement: "prozessnachrichten.generischeQuittierungEingang.1180",
  nsPrefix: null, // Kernmodul uses default namespace (xmlns="..."), no prefix
  targetNamespace: NS_XBAUK,
  requiredNamespaces: [NS_XBAUK],
  rootAttributes: ["produkt", "produkthersteller", "produktversion", "standard", "version"],
  requiredElements: ["nachrichtenkopf.g2g", "bezug", "nachrichtentyp"],
  xsdFile: resolve(XSD_DEV_DIR, "xbau-kernmodul-prozessnachrichten.xsd"),
};

/**
 * Compute the root key as it appears in parsed output, based on schema definition.
 */
function rootKeyFor(schema) {
  return schema.nsPrefix
    ? `${schema.nsPrefix}:${schema.rootElement}`
    : schema.rootElement;
}

// =============================================================================
// Test Suite
// =============================================================================

describe("XBau XSD-Validierung", () => {
  // --- 0201: Formelle Pruefung ---

  describe("build-0201 (baugenehmigung.formellePruefung.0201)", () => {
    const params0201Complete = {
      autor: BEHOERDE_AUTOR,
      leser: BEHOERDE_LESER,
      referenzUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      aktenzeichen: "AZ-2026-001",
      bezugNachrichtenUuid: "11111111-2222-3333-4444-555555555555",
      bezugNachrichtentyp: "0200",
      bezugErstellungszeit: "2026-03-15T10:00:00Z",
      antragVollstaendig: true,
      spaetestesGenehmigungsdatum: "2026-06-15",
    };

    const params0201Incomplete = {
      autor: BEHOERDE_AUTOR,
      leser: BEHOERDE_LESER,
      referenzUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      aktenzeichen: "AZ-2026-002",
      bezugNachrichtenUuid: "22222222-3333-4444-5555-666666666666",
      bezugNachrichtentyp: "0200",
      bezugErstellungszeit: "2026-03-15T11:00:00Z",
      antragVollstaendig: false,
      befundliste: ["Lageplan fehlt", "Bauzeichnung unvollstaendig"],
      fristDatum: "2026-04-15",
    };

    it("should generate well-formed XML (antragVollstaendig=true)", () => {
      const xml = build0201(params0201Complete);
      expect(() => assertWellFormedXml(xml)).not.toThrow();
    });

    it("should generate well-formed XML (antragVollstaendig=false, with Befunde)", () => {
      const xml = build0201(params0201Incomplete);
      expect(() => assertWellFormedXml(xml)).not.toThrow();
    });

    it("should have correct root element and namespace prefix", () => {
      const xml = build0201(params0201Complete);
      const parsed = assertWellFormedXml(xml);
      const root = assertRootElement(parsed, SCHEMA_0201.rootElement, SCHEMA_0201.nsPrefix);
      expect(root).toBeDefined();
    });

    it("should declare all required namespaces", () => {
      const xml = build0201(params0201Complete);
      assertNamespaceDeclarations(xml, SCHEMA_0201.requiredNamespaces);
    });

    it("should have all required root attributes", () => {
      const xml = build0201(params0201Complete);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_0201);
      assertRootAttributes(parsed[rootKey], SCHEMA_0201.rootAttributes);
    });

    it("should contain required elements (antragVollstaendig=true)", () => {
      const xml = build0201(params0201Complete);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_0201);
      assertRequiredElements(parsed[rootKey], SCHEMA_0201.requiredElements, SCHEMA_0201.rootElement);
    });

    it("should contain required elements (antragVollstaendig=false)", () => {
      const xml = build0201(params0201Incomplete);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_0201);
      assertRequiredElements(parsed[rootKey], SCHEMA_0201.requiredElements, SCHEMA_0201.rootElement);
    });

    it("should include befundFrist when antragVollstaendig=false and befundliste provided", () => {
      const xml = build0201(params0201Incomplete);
      expect(xml).toContain("befundFrist");
      expect(xml).toContain("befundliste");
      expect(xml).toContain("Lageplan fehlt");
    });

    it("should include unterlagenAntragVollstaendig when antragVollstaendig=true", () => {
      const xml = build0201(params0201Complete);
      expect(xml).toContain("unterlagenAntragVollstaendig");
      expect(xml).toContain("spaetestesGenehmigungsdatum");
    });

    it("should use correct codeliste URIs for Hochbau messages", () => {
      const xml = build0201(params0201Complete);
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:xbau-nachrichten");
      expect(xml).toContain("urn:xoev-de:kosit:codeliste:verzeichnisdienst");
    });

    it("should include XML declaration with UTF-8 encoding", () => {
      const xml = build0201(params0201Complete);
      expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });
  });

  // --- 1100: Rueckweisung G2G ---

  describe("build-1100 (prozessnachrichten.rueckweisung.G2G.1100)", () => {
    const params1100 = {
      autor: BEHOERDE_AUTOR,
      leser: BEHOERDE_LESER,
      fehlerkennzahl: "200",
      fehlertext: "Nachricht enthielt ungueltigen Nachrichtentyp",
      abgewieseneNachrichtenUUID: "33333333-4444-5555-6666-777777777777",
      abgewiesenerNachrichtentyp: "0200",
      abgewieseneErstellungszeit: "2026-03-15T12:00:00Z",
      abgewieseneNachrichtBase64: "PD94bWwgdmVyc2lvbj0iMS4wIj8+",
    };

    it("should generate well-formed XML", () => {
      const xml = build1100(params1100);
      expect(() => assertWellFormedXml(xml)).not.toThrow();
    });

    it("should have correct root element and namespace prefix", () => {
      const xml = build1100(params1100);
      const parsed = assertWellFormedXml(xml);
      const root = assertRootElement(parsed, SCHEMA_1100.rootElement, SCHEMA_1100.nsPrefix);
      expect(root).toBeDefined();
    });

    it("should declare all required namespaces", () => {
      const xml = build1100(params1100);
      assertNamespaceDeclarations(xml, SCHEMA_1100.requiredNamespaces);
    });

    it("should have all required root attributes", () => {
      const xml = build1100(params1100);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_1100);
      assertRootAttributes(parsed[rootKey], SCHEMA_1100.rootAttributes);
    });

    it("should contain required elements", () => {
      const xml = build1100(params1100);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_1100);
      assertRequiredElements(parsed[rootKey], SCHEMA_1100.requiredElements, SCHEMA_1100.rootElement);
    });

    it("should use Kernmodul codeliste URIs", () => {
      const xml = build1100(params1100);
      expect(xml).toContain("urn:xoev-de:xbau-kernmodul:codeliste:xbau-kernmodul-nachrichten");
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:xbau-fehlerkennzahlen");
    });

    it("should contain the rejected message as base64", () => {
      const xml = build1100(params1100);
      expect(xml).toContain("PD94bWwgdmVyc2lvbj0iMS4wIj8+");
    });
  });

  // --- 1180: Generische Eingangsquittung ---

  describe("build-1180 (prozessnachrichten.generischeQuittierungEingang.1180)", () => {
    const params1180 = {
      autor: BEHOERDE_AUTOR,
      leser: BEHOERDE_LESER,
      referenzUuid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      aktenzeichen: "AZ-2026-003",
      quittierteNachrichtenUUID: "44444444-5555-6666-7777-888888888888",
      quittierterNachrichtentyp: "0200",
      quittierteErstellungszeit: "2026-03-15T13:00:00Z",
    };

    it("should generate well-formed XML", () => {
      const xml = build1180(params1180);
      expect(() => assertWellFormedXml(xml)).not.toThrow();
    });

    it("should have correct root element and namespace prefix", () => {
      const xml = build1180(params1180);
      const parsed = assertWellFormedXml(xml);
      const root = assertRootElement(parsed, SCHEMA_1180.rootElement, SCHEMA_1180.nsPrefix);
      expect(root).toBeDefined();
    });

    it("should declare all required namespaces", () => {
      const xml = build1180(params1180);
      assertNamespaceDeclarations(xml, SCHEMA_1180.requiredNamespaces);
    });

    it("should have all required root attributes", () => {
      const xml = build1180(params1180);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_1180);
      assertRootAttributes(parsed[rootKey], SCHEMA_1180.rootAttributes);
    });

    it("should contain required elements", () => {
      const xml = build1180(params1180);
      const parsed = assertWellFormedXml(xml);
      const rootKey = rootKeyFor(SCHEMA_1180);
      assertRequiredElements(parsed[rootKey], SCHEMA_1180.requiredElements, SCHEMA_1180.rootElement);
    });

    it("should use quittierte Nachricht codeliste URI", () => {
      const xml = build1180(params1180);
      expect(xml).toContain("urn:xoev-de:xbau:codeliste:nachricht-eingangsquittierung");
    });

    it("should reference the acknowledged message UUID in bezug", () => {
      const xml = build1180(params1180);
      expect(xml).toContain("44444444-5555-6666-7777-888888888888");
    });
  });

  // --- Referenz-XML Regression Baseline ---

  describe("Referenz-XML Regression Baseline", () => {
    const referenceFiles = [
      {
        file: "baugenehmigung.antrag.0200_f180ba27-4549-4752-ab01-a7513866faa6.xml",
        rootElement: "baugenehmigung.antrag.0200",
        nsPrefix: "xbau",
        requiredNamespaces: [NS_XBAU],
      },
    ];

    for (const ref of referenceFiles) {
      const filePath = resolve(REFERENCE_XML_DIR, ref.file);
      const fileExists = existsSync(filePath);

      describe(`${ref.file}`, () => {
        (fileExists ? it : it.skip)("should be well-formed XML", () => {
          const xml = readFileSync(filePath, "utf-8");
          expect(() => assertWellFormedXml(xml)).not.toThrow();
        });

        (fileExists ? it : it.skip)("should have correct root element", () => {
          const xml = readFileSync(filePath, "utf-8");
          const parsed = assertWellFormedXml(xml);
          const root = assertRootElement(parsed, ref.rootElement, ref.nsPrefix);
          expect(root).toBeDefined();
        });

        (fileExists ? it : it.skip)("should declare required namespaces", () => {
          const xml = readFileSync(filePath, "utf-8");
          assertNamespaceDeclarations(xml, ref.requiredNamespaces);
        });
      });
    }

    // Statistik-Nachrichten Referenz-XMLs
    const statistikFiles = [
      "statistik.baugenehmigung.0421_sample.xml",
      "statistik.baubeginn.0423_sample.xml",
      "statistik.rohbaufertigstellung.0424_sample.xml",
      "statistik.baufertigstellung.0425_sample.xml",
      "statistik.bauabgang.0426_sample.xml",
      "statistik.bauueberhang.0427_sample.xml",
      "statistik.erloeschen.0422_sample.xml",
    ];

    for (const fileName of statistikFiles) {
      const filePath = resolve(REFERENCE_XML_DIR, fileName);
      const fileExists = existsSync(filePath);

      (fileExists ? it : it.skip)(`${fileName} should be well-formed XML`, () => {
        const xml = readFileSync(filePath, "utf-8");
        expect(() => assertWellFormedXml(xml)).not.toThrow();
      });
    }
  });

  // --- XSD Schema File Integrity ---

  describe("XSD Schema File Integrity", () => {
    const xsdFiles = [
      { path: resolve(XSD_DIR, "xbau-nachrichten-baugenehmigung.xsd"), name: "xbau-nachrichten-baugenehmigung.xsd" },
      { path: resolve(XSD_DIR, "xbau-baukasten.xsd"), name: "xbau-baukasten.xsd" },
      { path: resolve(XSD_DIR, "xbau-codes.xsd"), name: "xbau-codes.xsd" },
      { path: resolve(XSD_DEV_DIR, "xbau-kernmodul-prozessnachrichten.xsd"), name: "xbau-kernmodul-prozessnachrichten.xsd" },
      { path: resolve(XSD_DEV_DIR, "xbau-kernmodul-datentypen.xsd"), name: "xbau-kernmodul-datentypen.xsd" },
    ];

    for (const xsd of xsdFiles) {
      it(`${xsd.name} should exist and be parseable XML`, () => {
        expect(existsSync(xsd.path)).toBe(true);
        const content = readFileSync(xsd.path, "utf-8");
        expect(() => assertWellFormedXml(content)).not.toThrow();
      });
    }

    it("Baugenehmigung XSD should define element 0201", () => {
      const content = readFileSync(resolve(XSD_DIR, "xbau-nachrichten-baugenehmigung.xsd"), "utf-8");
      expect(content).toContain('name="baugenehmigung.formellePruefung.0201"');
    });

    it("Kernmodul XSD should define elements 1100 and 1180", () => {
      const content = readFileSync(resolve(XSD_DEV_DIR, "xbau-kernmodul-prozessnachrichten.xsd"), "utf-8");
      expect(content).toContain('name="prozessnachrichten.rueckweisung.G2G.1100"');
      expect(content).toContain('name="prozessnachrichten.generischeQuittierungEingang.1180"');
    });
  });

  // --- Namespace Consistency ---

  describe("Namespace Consistency", () => {
    it("Hochbau messages (0201) should use xbau namespace as root", () => {
      const xml = build0201({
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        referenzUuid: "test-uuid",
        aktenzeichen: "AZ-TEST",
        bezugNachrichtenUuid: "ref-uuid",
        bezugNachrichtentyp: "0200",
        bezugErstellungszeit: "2026-01-01T00:00:00Z",
        antragVollstaendig: true,
        spaetestesGenehmigungsdatum: "2026-12-31",
      });
      // Hochbau root element must be in xbau namespace
      expect(xml).toContain(`xmlns:xbau="${NS_XBAU}"`);
      expect(xml).toContain("xbau:baugenehmigung.formellePruefung.0201");
    });

    it("Kernmodul messages (1100) should declare xbauk namespace as default", () => {
      const xml = build1100({
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        fehlerkennzahl: "200",
        fehlertext: "Test",
        abgewieseneNachrichtenUUID: "test-uuid",
        abgewiesenerNachrichtentyp: "0200",
        abgewieseneErstellungszeit: "2026-01-01T00:00:00Z",
        abgewieseneNachrichtBase64: "dGVzdA==",
      });
      // Kernmodul uses default namespace (xmlns="...") not prefix xmlns:xbauk
      expect(xml).toContain(`xmlns="${NS_XBAUK}"`);
      expect(xml).toContain("<prozessnachrichten.rueckweisung.G2G.1100");
    });

    it("Kernmodul messages (1180) should declare xbauk namespace as default", () => {
      const xml = build1180({
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        referenzUuid: "test-uuid",
        aktenzeichen: "AZ-TEST",
        quittierteNachrichtenUUID: "test-uuid",
        quittierterNachrichtentyp: "0200",
        quittierteErstellungszeit: "2026-01-01T00:00:00Z",
      });
      // Kernmodul uses default namespace (xmlns="...") not prefix xmlns:xbauk
      expect(xml).toContain(`xmlns="${NS_XBAUK}"`);
      expect(xml).toContain("<prozessnachrichten.generischeQuittierungEingang.1180");
    });

    it("Hochbau child elements should be namespace-qualified (xbau: prefix)", () => {
      const xml = build0201({
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        referenzUuid: "test-uuid",
        aktenzeichen: "AZ-TEST",
        bezugNachrichtenUuid: "ref-uuid",
        bezugNachrichtentyp: "0200",
        bezugErstellungszeit: "2026-01-01T00:00:00Z",
        antragVollstaendig: true,
        spaetestesGenehmigungsdatum: "2026-12-31",
      });
      // Extension elements must be qualified (xbau: prefix)
      expect(xml).toContain("<xbau:bezug>");
      expect(xml).toContain("<xbau:antragVollstaendig>");
    });

    it("Kernmodul child elements should be unqualified (no prefix)", () => {
      const xml = build1100({
        autor: BEHOERDE_AUTOR,
        leser: BEHOERDE_LESER,
        fehlerkennzahl: "200",
        fehlertext: "Test",
        abgewieseneNachrichtenUUID: "test-uuid",
        abgewiesenerNachrichtentyp: "0200",
        abgewieseneErstellungszeit: "2026-01-01T00:00:00Z",
        abgewieseneNachrichtBase64: "dGVzdA==",
      });
      // Kernmodul elementFormDefault="unqualified" -> no prefix on child elements
      expect(xml).toContain("<rueckweisungDaten>");
      expect(xml).not.toContain("<xbauk:rueckweisungDaten>");
    });
  });

  // --- Optional: xmllint integration (skipped if not available) ---

  describe("xmllint XSD Validation (optional, CI-only)", () => {
    let xmllintAvailable = false;

    beforeAll(() => {
      try {
        execSync("which xmllint", { stdio: "pipe" });
        xmllintAvailable = true;
      } catch {
        xmllintAvailable = false;
      }
    });

    it.skip("xmllint validation placeholder - enable when xmllint is installed in CI", () => {
      // This test is intentionally skipped.
      // To enable in CI, install libxml2-utils and remove .skip:
      //
      //   apt-get install -y libxml2-utils
      //
      // Then validate against XSD:
      //   xmllint --schema <xsd-path> --noout <xml-file>
      //
      // Note: XSD files reference external schemas via URL.
      // For offline CI, download all referenced schemas and
      // adjust schemaLocation paths to local copies.
      expect(xmllintAvailable).toBe(true);
    });
  });
});
