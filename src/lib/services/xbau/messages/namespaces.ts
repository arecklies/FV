/**
 * XBau-Namespace-Konfiguration (ADR-004, backend.md)
 *
 * Zentrale Definition aller XBau-Namespaces.
 * Element-Qualifizierung:
 * - xbau (Fachmodul Hochbau): elementFormDefault="qualified" -> alle Elemente mit xbau: Prefix
 * - xbauk (Kernmodul): elementFormDefault="unqualified" -> nur Root-Element qualifiziert, Kinder ohne Prefix
 */

export const NS_XBAU = "http://www.xleitstelle.de/xbau/2/6";
export const NS_XBAUK = "http://www.xleitstelle.de/xbau/kernmodul/1/3/0";

/** Produkt-Attribute auf Nachricht.G2G (Pflicht, aus XSD) */
export const PRODUKT_NAME = "FV-SaaS";
export const PRODUKT_HERSTELLER = "Fachverfahren SaaS";
export const PRODUKT_VERSION = "1.0.0";

/** Standard- und Versions-Attribute (fixed in XSD) */
export const STANDARD_KERNMODUL = "XBau-Kernmodul";
export const VERSION_KERNMODUL = "1.3.0";
export const STANDARD_HOCHBAU = "XBau-Hochbau";
export const VERSION_HOCHBAU = "2.6";

/** Codelisten-URIs und Versionen (exakt aus xbau-kernmodul-codes.xsd) */
export const CODELISTE = {
  kernmodulNachrichten: {
    listURI: "urn:xoev-de:xbau-kernmodul:codeliste:xbau-kernmodul-nachrichten",
    listVersionID: "3.0",
  },
  xbauNachrichten: {
    listURI: "urn:xoev-de:xbau:codeliste:xbau-nachrichten",
    listVersionID: "4.0",
  },
  fehlerkennzahlen: {
    listURI: "urn:xoev-de:xbau:codeliste:xbau-fehlerkennzahlen",
    listVersionID: "1.0",
  },
  quittierteNachricht: {
    listURI: "urn:xoev-de:xbau:codeliste:nachricht-eingangsquittierung",
    listVersionID: "1.0",
  },
  verzeichnisdienst: {
    listURI: "urn:xoev-de:kosit:codeliste:verzeichnisdienst",
    listVersionID: "1",
  },
  formelleBefundeArt: {
    listURI: "urn:xoev-de:xbau:codeliste:formellebefundeart",
    listVersionID: "1.0",
  },
} as const;
