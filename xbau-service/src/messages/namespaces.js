/**
 * XBau-Namespace-Konfiguration (ADR-004)
 * Isolierte Kopie fuer den XBau-Service (E6: separate Schemas)
 */

export const NS_XBAU = "http://www.xleitstelle.de/xbau/2/6";
export const NS_XBAUK = "http://www.xleitstelle.de/xbau/kernmodul/1/3/0";
/** Basisnachricht G2G Namespace (fuer bezugNachricht-Kinder, Identifikation.Nachricht) */
export const NS_BN_G2G = "http://xoev.de/schemata/basisnachricht/g2g/1_1";

export const PRODUKT_NAME = "FV-SaaS";
export const PRODUKT_HERSTELLER = "Fachverfahren SaaS";
export const PRODUKT_VERSION = "1.0.0";

export const STANDARD_KERNMODUL = "XBau-Kernmodul";
export const VERSION_KERNMODUL = "1.3.0";
export const STANDARD_HOCHBAU = "XBau-Hochbau";
export const VERSION_HOCHBAU = "2.6";

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
  // Statistik-Codelisten (aus xbau-codes.xsd, PROJ-57)
  artDesBauens: {
    listURI: "urn:xoev-de:xbau:codeliste:artdesbauens",
    listVersionID: "1.0",
  },
  baustoff: {
    listURI: "urn:xoev-de:xbau:codeliste:baustoff",
    listVersionID: "2.0",
  },
  wohngebaeudeArt: {
    listURI: "urn:xoev-de:xbau:codeliste:wohngebaeudeart",
    listVersionID: "2.0",
  },
  nichtwohngebaeudeArt: {
    listURI: "urn:xoev-de:xbau:codeliste:nichtwohngebaeudeart",
    listVersionID: "3.0",
  },
  haustypWohngebaeude: {
    listURI: "urn:xoev-de:xbau:codeliste:haustypwohngebaeude",
    listVersionID: "2.0",
  },
  systematikDerBauwerkeBautaetigkeit: {
    listURI: "urn:xoev-de:destatis:codeliste:systematikderbauwerkebautaetigkeit",
    // listVersionID ist required aber nicht fixed in XSD — muss vom Aufrufer gesetzt werden
    listVersionID: null,
  },
  kuehlung: {
    listURI: "urn:xoev-de:xbau:codeliste:kuehlung",
    listVersionID: "2.0",
  },
  lueftungsanlagen: {
    listURI: "urn:xoev-de:xbau:codeliste:lueftungsanlagen",
    listVersionID: "2.0",
  },
  statusSozialerWohnungsbau: {
    listURI: "urn:xoev-de:xbau:codeliste:statussozialerwohnungsbau",
    listVersionID: "1.0",
  },
  bauherrOderEigentuemerArt: {
    listURI: "urn:xoev-de:xbau:codeliste:bauherrodereigentuemerart",
    listVersionID: "2.0",
  },
  baufortschritt: {
    listURI: "urn:xoev-de:xbau:codeliste:baufortschritt",
    listVersionID: "2.0",
  },
  raeumeAnzahl: {
    listURI: "urn:xoev-de:xbau:codeliste:anzahlraeume",
    listVersionID: "3.0",
  },
  abgangUmfang: {
    listURI: "urn:xoev-de:xbau:codeliste:abgangumfang",
    listVersionID: "2.0",
  },
  abgangUrsache: {
    listURI: "urn:xoev-de:xbau:codeliste:abgangursache",
    listVersionID: "2.0",
  },
  gebaeudeAlter: {
    listURI: "urn:xoev-de:xbau:codeliste:gebaeudealter",
    listVersionID: "2.0",
  },
};
