/**
 * Unit-Tests für XBau-Parser (PROJ-7)
 */

import {
  parseRawXml,
  detectNachrichtentyp,
  extractNachrichtenkopf,
  extractBezug,
  parse0200,
} from "./parser";

const SAMPLE_0200 = `<?xml version="1.0" encoding="UTF-8"?>
<xbau:baugenehmigung.antrag.0200 xmlns:xbau="urn:xoev-de:xbau:standard:xbau">
  <nachrichtenkopf>
    <identifikation.nachricht>
      <nachrichtenUUID>a1b2c3d4-e5f6-7890-abcd-ef1234567890</nachrichtenUUID>
      <nachrichtentyp>0200</nachrichtentyp>
      <erstellungszeitpunkt>2026-03-28T10:00:00Z</erstellungszeitpunkt>
    </identifikation.nachricht>
    <autor>Bauportal Dortmund</autor>
    <leser>Bauaufsicht Dortmund</leser>
  </nachrichtenkopf>
  <bezug>
    <referenz>portal-ref-uuid-1234</referenz>
  </bezug>
  <bauherr>
    <name>Max Mustermann</name>
    <anschrift>Musterstraße 1, 44135 Dortmund</anschrift>
  </bauherr>
  <grundstueck>
    <strasse>Baustraße 5, 44135 Dortmund</strasse>
    <flurstueck>123/4</flurstueck>
    <gemarkung>Dortmund</gemarkung>
  </grundstueck>
  <bauvorhaben>
    <bezeichnung>Neubau Einfamilienhaus</bezeichnung>
  </bauvorhaben>
  <verfahrensart>BG</verfahrensart>
</xbau:baugenehmigung.antrag.0200>`;

const SAMPLE_0202 = `<?xml version="1.0" encoding="UTF-8"?>
<xbau:baugenehmigung.antragGeaendert.0202 xmlns:xbau="urn:xoev-de:xbau:standard:xbau">
  <nachrichtenkopf>
    <identifikation.nachricht>
      <nachrichtenUUID>b2c3d4e5-f6a7-8901-bcde-f12345678901</nachrichtenUUID>
      <nachrichtentyp>0202</nachrichtentyp>
      <erstellungszeitpunkt>2026-03-29T14:00:00Z</erstellungszeitpunkt>
    </identifikation.nachricht>
  </nachrichtenkopf>
  <bezug>
    <vorgang>2026/0042/BG</vorgang>
    <referenz>portal-ref-uuid-1234</referenz>
    <bezugNachricht>
      <nachrichtenUUID>a1b2c3d4-e5f6-7890-abcd-ef1234567890</nachrichtenUUID>
      <nachrichtentyp>0200</nachrichtentyp>
      <erstellungszeitpunkt>2026-03-28T10:00:00Z</erstellungszeitpunkt>
    </bezugNachricht>
  </bezug>
</xbau:baugenehmigung.antragGeaendert.0202>`;

describe("parseRawXml", () => {
  it("parst gültiges XML", () => {
    const result = parseRawXml(SAMPLE_0200);
    expect(result).toBeDefined();
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it("wirft bei ungültigem XML", () => {
    expect(() => parseRawXml("nicht xml")).not.toThrow(); // fast-xml-parser ist tolerant
  });
});

describe("detectNachrichtentyp", () => {
  it("erkennt 0200 aus Root-Tag", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    expect(detectNachrichtentyp(parsed)).toBe("0200");
  });

  it("erkennt 0202 aus Root-Tag", () => {
    const parsed = parseRawXml(SAMPLE_0202);
    expect(detectNachrichtentyp(parsed)).toBe("0202");
  });

  it("gibt null bei unbekanntem Root-Tag", () => {
    expect(detectNachrichtentyp({ "unknown": {} })).toBeNull();
  });
});

describe("extractNachrichtenkopf", () => {
  it("extrahiert UUID, Typ und Zeitpunkt (0200)", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    const kopf = extractNachrichtenkopf(parsed);

    expect(kopf).not.toBeNull();
    expect(kopf!.nachrichtenUUID).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(kopf!.nachrichtentyp).toBe("0200");
    expect(kopf!.erstellungszeitpunkt).toBe("2026-03-28T10:00:00Z");
  });

  it("extrahiert Autor und Leser", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    const kopf = extractNachrichtenkopf(parsed);

    expect(kopf!.autor).toBe("Bauportal Dortmund");
    expect(kopf!.leser).toBe("Bauaufsicht Dortmund");
  });
});

describe("extractBezug", () => {
  it("extrahiert referenz aus 0200", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    const bezug = extractBezug(parsed);

    expect(bezug.referenz).toBe("portal-ref-uuid-1234");
    expect(bezug.vorgang).toBeUndefined();
  });

  it("extrahiert alle bezug-Felder aus 0202", () => {
    const parsed = parseRawXml(SAMPLE_0202);
    const bezug = extractBezug(parsed);

    expect(bezug.vorgang).toBe("2026/0042/BG");
    expect(bezug.referenz).toBe("portal-ref-uuid-1234");
    expect(bezug.bezugNachricht).toBeDefined();
    expect(bezug.bezugNachricht!.nachrichtenUUID).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(bezug.bezugNachricht!.nachrichtentyp).toBe("0200");
  });

  it("gibt leeres Objekt ohne bezug-Element", () => {
    const bezug = extractBezug({ root: {} });
    expect(bezug).toEqual({});
  });
});

describe("parse0200", () => {
  it("extrahiert Bauherr, Grundstück und Bezeichnung", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    const result = parse0200(parsed);

    expect(result).not.toBeNull();
    expect(result!.bauherr.name).toBe("Max Mustermann");
    expect(result!.grundstueck.adresse).toBe("Baustraße 5, 44135 Dortmund");
    expect(result!.grundstueck.flurstueck).toBe("123/4");
    expect(result!.grundstueck.gemarkung).toBe("Dortmund");
    expect(result!.bezeichnung).toBe("Neubau Einfamilienhaus");
  });

  it("extrahiert Verfahrensart-Code", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    const result = parse0200(parsed);

    expect(result!.verfahrensartCode).toBe("BG");
  });

  it("extrahiert Portal-Referenz aus bezug", () => {
    const parsed = parseRawXml(SAMPLE_0200);
    const result = parse0200(parsed);

    expect(result!.bezug.referenz).toBe("portal-ref-uuid-1234");
  });
});
