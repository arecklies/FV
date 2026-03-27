import { NS_XBAU, NS_XBAUK, NS_BN_G2G, CODELISTE } from "./namespaces.js";

/**
 * Shared helpers for Statistik-Nachrichten 0420-0427 (PROJ-57)
 *
 * XSD: xbau-nachrichten-statistik.xsd
 * Nachrichtenspezifische Elemente sind qualified (NS_XBAU prefix).
 * Kernmodul-Elemente innerhalb unqualified-Kontexte verwenden leeren Namespace.
 *
 * elementFormDefault="qualified" in xbau-nachrichten-statistik.xsd means
 * all elements in the xbau namespace are qualified (use NS_XBAU).
 */

/**
 * Append a Code element with listURI and listVersionID attributes.
 * @param {import("xmlbuilder2/lib/interfaces").XMLBuilder} parent
 * @param {string} elementName - local element name
 * @param {string} codeValue - the code value
 * @param {{ listURI: string, listVersionID: string|null }} codelist - from CODELISTE
 * @param {string|null} [listVersionIDOverride] - override for codelists without fixed version
 */
export function appendCodeElement(parent, elementName, codeValue, codelist, listVersionIDOverride) {
  const el = parent.ele(NS_XBAU, elementName);
  el.att("listURI", codelist.listURI);
  const version = listVersionIDOverride ?? codelist.listVersionID;
  if (version) el.att("listVersionID", version);
  // code ist unqualified (aus xoev-code.xsd, elementFormDefault="unqualified")
  el.ele("", "code").txt(codeValue);
  return el;
}

/**
 * Append BezugStatistikmeldung (extends Bezug with uuidGebaeude + ordnungsnummer).
 * XSD: xbau-nachrichten-statistik.xsd, type BezugStatistikmeldung
 * Base type Bezug has: referenz?, vorgang?, bezugNachricht?
 */
export function appendBezugStatistikmeldung(parent, data) {
  const bezug = parent.ele(NS_XBAU, "bezug");
  // Basis-Typ Bezug: referenz, vorgang, bezugNachricht sind unqualified (form="unqualified" in xbau-baukasten.xsd)
  if (data.referenz) bezug.ele("", "referenz").txt(data.referenz);
  if (data.vorgang) bezug.ele("", "vorgang").txt(data.vorgang);
  if (data.bezugNachricht) {
    const bn = bezug.ele("", "bezugNachricht");
    // Identifikation.NachrichtType-Kinder im bn-g2g Namespace, code unqualified
    bn.ele(NS_BN_G2G, "nachrichtenUUID").txt(data.bezugNachricht.nachrichtenUUID);
    const bnTyp = bn.ele(NS_BN_G2G, "nachrichtentyp")
      .att("listURI", CODELISTE.xbauNachrichten.listURI)
      .att("listVersionID", CODELISTE.xbauNachrichten.listVersionID);
    bnTyp.ele("", "code").txt(data.bezugNachricht.nachrichtentyp);
    bn.ele(NS_BN_G2G, "erstellungszeitpunkt").txt(data.bezugNachricht.erstellungszeitpunkt);
  }
  // Statistik-Erweiterung: uuidGebaeude, ordnungsnummer sind qualified (NS_XBAU)
  bezug.ele(NS_XBAU, "uuidGebaeude").txt(data.uuidGebaeude);
  if (data.ordnungsnummer) bezug.ele(NS_XBAU, "ordnungsnummer").txt(data.ordnungsnummer);
  return bezug;
}

/**
 * Append BezugErweitert (for 0420 which uses xbauk:BezugErweitert).
 * XSD: xbau-kernmodul, type BezugErweitert — uses kernmodul namespace
 */
export function appendBezugErweitert(parent, data) {
  const bezug = parent.ele(NS_XBAU, "bezug");
  // Basis-Typ Bezug: referenz, vorgang, bezugNachricht sind unqualified
  if (data.referenz) bezug.ele("", "referenz").txt(data.referenz);
  if (data.vorgang) bezug.ele("", "vorgang").txt(data.vorgang);
  if (data.bezugNachricht) {
    const bn = bezug.ele("", "bezugNachricht");
    bn.ele(NS_BN_G2G, "nachrichtenUUID").txt(data.bezugNachricht.nachrichtenUUID);
    const bnTyp = bn.ele(NS_BN_G2G, "nachrichtentyp")
      .att("listURI", CODELISTE.xbauNachrichten.listURI)
      .att("listVersionID", CODELISTE.xbauNachrichten.listVersionID);
    bnTyp.ele("", "code").txt(data.bezugNachricht.nachrichtentyp);
    bn.ele(NS_BN_G2G, "erstellungszeitpunkt").txt(data.bezugNachricht.erstellungszeitpunkt);
  }
  if (data.referenzAntragsservice) {
    bezug.ele(NS_XBAU, "referenzAntragsservice").txt(data.referenzAntragsservice);
  }
  return bezug;
}

/**
 * Append AllgemeineAngaben (used by 0421-0427).
 * XSD type: AllgemeineAngaben
 */
export function appendAllgemeineAngaben(parent, data) {
  const aa = parent.ele(NS_XBAU, "allgemeineAngaben");
  aa.ele(NS_XBAU, "anzahlDerGebaeudeImBauvorhaben").txt(String(data.anzahlDerGebaeudeImBauvorhaben));
  if (data.beteiligteBauprojekt) {
    appendBeteiligteBauprojektStatistik(aa, data.beteiligteBauprojekt);
  }
  if (data.baugrundstueck) {
    for (const gs of Array.isArray(data.baugrundstueck) ? data.baugrundstueck : [data.baugrundstueck]) {
      appendGrundstueckStatistik(aa, gs);
    }
  }
  if (data.lageGebaeude) {
    // GeoreferenzierteFlaeche — xbauk namespace
    const lg = aa.ele(NS_XBAU, "lageGebaeude");
    if (data.lageGebaeude.wkt) lg.txt(data.lageGebaeude.wkt);
  }
  if (data.verortungHausnummer) {
    const vh = aa.ele(NS_XBAU, "verortungHausnummer");
    if (data.verortungHausnummer.wkt) vh.txt(data.verortungHausnummer.wkt);
  }
  return aa;
}

/**
 * Append AllgemeineAngabenDatenBauvorhaben (used by 0420).
 * XSD type: AllgemeineAngabenDatenBauvorhaben — simpler, no lageGebaeude/verortungHausnummer
 */
export function appendAllgemeineAngabenDatenBauvorhaben(parent, data) {
  const aa = parent.ele(NS_XBAU, "allgemeineAngaben");
  aa.ele(NS_XBAU, "anzahlDerGebaeudeImBauvorhaben").txt(String(data.anzahlDerGebaeudeImBauvorhaben));
  if (data.beteiligteBauprojekt) {
    appendBeteiligteBauprojektStatistik(aa, data.beteiligteBauprojekt);
  }
  if (data.baugrundstueck) {
    for (const gs of Array.isArray(data.baugrundstueck) ? data.baugrundstueck : [data.baugrundstueck]) {
      appendGrundstueckStatistik(aa, gs);
    }
  }
  return aa;
}

/**
 * Append BeteiligteBauprojektStatistik
 */
function appendBeteiligteBauprojektStatistik(parent, data) {
  const bp = parent.ele(NS_XBAU, "beteiligteBauprojekt");
  const bauherren = Array.isArray(data.bauherr) ? data.bauherr : [data.bauherr];
  for (const bh of bauherren) {
    const bhEl = bp.ele(NS_XBAU, "bauherr");
    if (bh.name) bhEl.ele(NS_XBAU, "name").txt(bh.name);
    if (bh.vorname) bhEl.ele(NS_XBAU, "vorname").txt(bh.vorname);
  }
  if (data.grundstueckseigentuemer) {
    const ge = bp.ele(NS_XBAU, "grundstueckseigentuemer");
    if (data.grundstueckseigentuemer.name) ge.ele(NS_XBAU, "name").txt(data.grundstueckseigentuemer.name);
  }
  return bp;
}

/**
 * Append GrundstueckStatistik
 */
function appendGrundstueckStatistik(parent, data) {
  const gs = parent.ele(NS_XBAU, "baugrundstueck");
  if (data.gemarkung) gs.ele(NS_XBAU, "gemarkung").txt(data.gemarkung);
  if (data.flurstueck) gs.ele(NS_XBAU, "flurstueck").txt(data.flurstueck);
  if (data.strasse) gs.ele(NS_XBAU, "strasse").txt(data.strasse);
  if (data.hausnummer) gs.ele(NS_XBAU, "hausnummer").txt(data.hausnummer);
  if (data.plz) gs.ele(NS_XBAU, "plz").txt(data.plz);
  if (data.ort) gs.ele(NS_XBAU, "ort").txt(data.ort);
  return gs;
}

/**
 * Append DatenEinzelnesGebaeude (used by 0421, 0423, 0424, 0425, 0427).
 * XSD type: DatenEinzelnesGebaeude
 */
export function appendDatenEinzelnesGebaeude(parent, data) {
  const deg = parent.ele(NS_XBAU, "datenEinzelnesGebaeude");

  if (data.lageBaugrundstueck) {
    const lb = deg.ele(NS_XBAU, "lageBaugrundstueck");
    if (data.lageBaugrundstueck.gemeindeschluessel) {
      lb.ele(NS_XBAUK, "gemeindeschluessel").txt(data.lageBaugrundstueck.gemeindeschluessel);
    }
    if (data.lageBaugrundstueck.gemeindeteilschluessel) {
      lb.ele(NS_XBAUK, "gemeindeteilschluessel").txt(data.lageBaugrundstueck.gemeindeteilschluessel);
    }
  }
  if (data.strassenschluessel) {
    deg.ele(NS_XBAU, "strassenschluessel").txt(data.strassenschluessel);
  }
  if (data.artDesBauens) {
    appendCodeElement(deg, "artDesBauens", data.artDesBauens, CODELISTE.artDesBauens);
  }

  // baugenehmigung is required
  appendBaugenehmigungErweitert(deg, data.baugenehmigung);

  if (data.angabenGebaeude) {
    appendAngabenGebaeude(deg, data.angabenGebaeude);
  }
  if (data.ueberwiegendVerwendeterBaustoff) {
    appendCodeElement(deg, "ueberwiegendVerwendeterBaustoff", data.ueberwiegendVerwendeterBaustoff, CODELISTE.baustoff);
  }
  if (data.heizungHeizenergie) {
    appendHeizungHeizenergie(deg, data.heizungHeizenergie);
  }
  if (data.sonstigeLueftungsanlagen) {
    appendCodeElement(deg, "sonstigeLueftungsanlagen", data.sonstigeLueftungsanlagen, CODELISTE.lueftungsanlagen);
  }
  if (data.kuehlung) {
    appendCodeElement(deg, "kuehlung", data.kuehlung, CODELISTE.kuehlung);
  }
  if (data.erfuellungGEG) {
    appendErfuellungGEG(deg, data.erfuellungGEG);
  }
  if (data.bruttoRauminhaltBRI != null) {
    deg.ele(NS_XBAU, "bruttoRauminhaltBRI").txt(String(data.bruttoRauminhaltBRI));
  }
  if (data.anzahlVollgeschosse != null) {
    deg.ele(NS_XBAU, "anzahlVollgeschosse").txt(String(data.anzahlVollgeschosse));
  }
  if (data.flaechen) {
    for (const fl of Array.isArray(data.flaechen) ? data.flaechen : [data.flaechen]) {
      appendFlaechenStatistik(deg, fl);
    }
  }
  if (data.anzahlDerWohnungen) {
    appendAnzahlDerWohnungenErweitert(deg, data.anzahlDerWohnungen);
  }
  if (data.grundflaeche) {
    appendBebauteGrundstuecksflaeche(deg, data.grundflaeche);
  }
  if (data.baukosten) {
    for (const bk of Array.isArray(data.baukosten) ? data.baukosten : [data.baukosten]) {
      appendKostenEinzelnesGebaeudeStatistik(deg, bk);
    }
  }
  if (data.datumAntragstellung) {
    deg.ele(NS_XBAU, "datumAntragstellung").txt(data.datumAntragstellung);
  }
  if (data.voraussichtlicheFertigstellung) {
    deg.ele(NS_XBAU, "voraussichtlicheFertigstellung").txt(data.voraussichtlicheFertigstellung);
  }
  if (data.statusSozialerWohnungsbau) {
    appendCodeElement(deg, "statusSozialerWohnungsbau", data.statusSozialerWohnungsbau, CODELISTE.statusSozialerWohnungsbau);
  }

  return deg;
}

/**
 * Append BaugenehmigungErweitert — required child of DatenEinzelnesGebaeude
 */
function appendBaugenehmigungErweitert(parent, data) {
  const bg = parent.ele(NS_XBAU, "baugenehmigung");
  // Basistyp Baugenehmigung: bauscheinnummer?, verfahrensart, artDerBautaetigkeit, bauAmBestand?, ...
  if (data.bauscheinnummer) bg.ele(NS_XBAU, "bauscheinnummer").txt(data.bauscheinnummer);
  // verfahrensart (Pflicht)
  appendCodeElement(bg, "verfahrensart", data.verfahrensart ?? "1", CODELISTE.verfahrensartAnStatistik);
  // artDerBautaetigkeit (Pflicht)
  appendCodeElement(bg, "artDerBautaetigkeit", data.artDerBautaetigkeit ?? "1", CODELISTE.bautaetigkeitArt);
  // Extension: datumBaugenehmigung (Pflicht)
  if (data.datumBaugenehmigung) {
    bg.ele(NS_XBAU, "datumBaugenehmigung").txt(data.datumBaugenehmigung);
  }
  return bg;
}

/**
 * Append AngabenGebaeude
 */
function appendAngabenGebaeude(parent, data) {
  const ag = parent.ele(NS_XBAU, "angabenGebaeude");
  if (data.artDesWohngebaeudes) {
    appendCodeElement(ag, "artDesWohngebaeudes", data.artDesWohngebaeudes, CODELISTE.wohngebaeudeArt);
  }
  if (data.haustypWohngebaeude) {
    appendCodeElement(ag, "haustypWohngebaeude", data.haustypWohngebaeude, CODELISTE.haustypWohngebaeude);
  }
  if (data.artDesNichtwohngebaeudes) {
    appendCodeElement(ag, "artDesNichtwohngebaeudes", data.artDesNichtwohngebaeudes, CODELISTE.nichtwohngebaeudeArt);
  }
  if (data.artDesGebaeudes) {
    appendCodeElement(
      ag, "artDesGebaeudes", data.artDesGebaeudes.code,
      CODELISTE.systematikDerBauwerkeBautaetigkeit,
      data.artDesGebaeudes.listVersionID
    );
  }
  return ag;
}

/**
 * Append HeizungHeizenergie
 */
function appendHeizungHeizenergie(parent, data) {
  const hh = parent.ele(NS_XBAU, "heizungHeizenergie");
  if (data.artDerHeizung) {
    hh.ele(NS_XBAU, "artDerHeizung").txt(data.artDerHeizung);
  }
  if (data.heizenergie) {
    hh.ele(NS_XBAU, "heizenergie").txt(data.heizenergie);
  }
  return hh;
}

/**
 * Append ErfuellungGEG
 */
function appendErfuellungGEG(parent, data) {
  const eg = parent.ele(NS_XBAU, "erfuellungGEG");
  if (data.erfuellt != null) {
    eg.ele(NS_XBAU, "erfuellt").txt(data.erfuellt ? "true" : "false");
  }
  return eg;
}

/**
 * Append FlaechenStatistik
 */
function appendFlaechenStatistik(parent, data) {
  const fl = parent.ele(NS_XBAU, "flaechen");
  if (data.nutzungseinheit) {
    fl.ele(NS_XBAU, "nutzungseinheit").txt(data.nutzungseinheit);
  }
  if (data.wohnflaeche != null) {
    fl.ele(NS_XBAU, "wohnflaeche").txt(String(data.wohnflaeche));
  }
  if (data.nutzflaeche != null) {
    fl.ele(NS_XBAU, "nutzflaeche").txt(String(data.nutzflaeche));
  }
  return fl;
}

/**
 * Append AnzahlDerWohnungenErweitert
 */
function appendAnzahlDerWohnungenErweitert(parent, data) {
  const aw = parent.ele(NS_XBAU, "anzahlDerWohnungen");
  if (data.anzahl != null) {
    aw.ele(NS_XBAU, "anzahl").txt(String(data.anzahl));
  }
  return aw;
}

/**
 * Append BebauteGrundstuecksflaeche
 */
function appendBebauteGrundstuecksflaeche(parent, data) {
  const gf = parent.ele(NS_XBAU, "grundflaeche");
  if (data.bebauteFlaeche != null) {
    gf.ele(NS_XBAU, "bebauteFlaeche").txt(String(data.bebauteFlaeche));
  }
  if (data.unbebauteFlaeche != null) {
    gf.ele(NS_XBAU, "unbebauteFlaeche").txt(String(data.unbebauteFlaeche));
  }
  return gf;
}

/**
 * Append KostenEinzelnesGebaeudeStatistik
 */
function appendKostenEinzelnesGebaeudeStatistik(parent, data) {
  const bk = parent.ele(NS_XBAU, "baukosten");
  if (data.veranschlagteKosten != null) {
    bk.ele(NS_XBAU, "veranschlagteKosten").txt(String(data.veranschlagteKosten));
  }
  return bk;
}

/**
 * Append Ansprechpartner (choice: bauamt | bevollmaechtigter | architektEntwurfsverfasser).
 * Used by 0421-0427.
 */
export function appendAnsprechpartner(parent, data) {
  if (!data) return;
  const ansprechpartnerList = Array.isArray(data) ? data : [data];
  for (const ap of ansprechpartnerList) {
    const apEl = parent.ele(NS_XBAU, "ansprechpartner");
    if (ap.bauamt) {
      const ba = apEl.ele(NS_XBAU, "bauamt");
      const nn = ba.ele(NS_XBAU, "nameNatuerlichePerson");
      if (ap.bauamt.familienname) nn.ele(NS_XBAUK, "familienname").txt(ap.bauamt.familienname);
      if (ap.bauamt.vorname) nn.ele(NS_XBAUK, "vorname").txt(ap.bauamt.vorname);
      if (ap.bauamt.telefon) {
        const kom = ba.ele(NS_XBAU, "kommunikation");
        kom.ele(NS_XBAUK, "telefon").txt(ap.bauamt.telefon);
      }
    } else if (ap.bevollmaechtigter) {
      const bv = apEl.ele(NS_XBAU, "bevollmaechtigter");
      if (bv && ap.bevollmaechtigter.name) bv.ele(NS_XBAUK, "name").txt(ap.bevollmaechtigter.name);
    } else if (ap.architektEntwurfsverfasser) {
      const ae = apEl.ele(NS_XBAU, "architektEntwurfsverfasser");
      if (ae && ap.architektEntwurfsverfasser.name) ae.ele(NS_XBAUK, "name").txt(ap.architektEntwurfsverfasser.name);
    }
  }
}

/**
 * Append AnsprechpartnerMitEinwilligung (choice: bevollmaechtigter | architektEntwurfsverfasser + einwilligung).
 * Used by 0420.
 */
export function appendAnsprechpartnerMitEinwilligung(parent, data) {
  if (!data) return;
  const list = Array.isArray(data) ? data : [data];
  for (const ap of list) {
    const apEl = parent.ele(NS_XBAU, "ansprechpartner");
    const dap = apEl.ele(NS_XBAU, "datenAnsprechpartner");
    if (ap.bevollmaechtigter) {
      const bv = dap.ele(NS_XBAU, "bevollmaechtigter");
      if (ap.bevollmaechtigter.name) bv.ele(NS_XBAUK, "name").txt(ap.bevollmaechtigter.name);
    } else if (ap.architektEntwurfsverfasser) {
      const ae = dap.ele(NS_XBAU, "architektEntwurfsverfasser");
      if (ap.architektEntwurfsverfasser.name) ae.ele(NS_XBAUK, "name").txt(ap.architektEntwurfsverfasser.name);
    }
    if (ap.einwilligungAnsprechpartner) {
      apEl.ele(NS_XBAU, "einwilligungAnsprechpartner").txt("true");
    }
  }
}

/**
 * Append DatenBauabgang (used by 0426).
 * XSD type: DatenBauabgang from xbau-baukasten.xsd
 */
export function appendDatenBauabgang(parent, data) {
  const dba = parent.ele(NS_XBAU, "datenBauabgang");
  if (data.lageBaugrundstueck) {
    const lb = dba.ele(NS_XBAU, "lageBaugrundstueck");
    if (data.lageBaugrundstueck.gemeindeschluessel) {
      lb.ele(NS_XBAUK, "gemeindeschluessel").txt(data.lageBaugrundstueck.gemeindeschluessel);
    }
  }
  if (data.strassenschluessel) {
    dba.ele(NS_XBAU, "strassenschluessel").txt(data.strassenschluessel);
  }
  if (data.bauabgang) {
    const ba = dba.ele(NS_XBAU, "bauabgang");
    ba.ele(NS_XBAU, "abgangszeitraumDatum").txt(data.bauabgang.abgangszeitraumDatum);
    appendCodeElement(ba, "alterDesGebaeudes", data.bauabgang.alterDesGebaeudes, CODELISTE.gebaeudeAlter);
    appendCodeElement(ba, "umfangDesAbgangs", data.bauabgang.umfangDesAbgangs, CODELISTE.abgangUmfang);
    appendCodeElement(ba, "ursacheDesAbgangs", data.bauabgang.ursacheDesAbgangs, CODELISTE.abgangUrsache);
    // groesseDesAbgangs (Pflicht laut XSD)
    const gda = ba.ele(NS_XBAU, "groesseDesAbgangs");
    if (data.bauabgang.groesseDesAbgangs?.anzahlRaeume) {
      // anzahlRaeume hat Typ Wohnungsprofil: anzahlWohnungen, kategorie, ...
      for (const wp of data.bauabgang.groesseDesAbgangs.anzahlRaeume) {
        const ar = gda.ele(NS_XBAU, "anzahlRaeume");
        if (wp.anzahlWohnungen != null) ar.ele(NS_XBAU, "anzahlWohnungen").txt(String(wp.anzahlWohnungen));
        if (wp.kategorie) appendCodeElement(ar, "kategorie", wp.kategorie, CODELISTE.raeumeAnzahl);
      }
    }
    // nutzflaeche (Pflicht laut XSD)
    ba.ele(NS_XBAU, "nutzflaeche").txt(String(data.bauabgang.nutzflaeche ?? 0));
  }
  if (data.artDesEigentuemers) {
    appendCodeElement(dba, "artDesEigentuemers", data.artDesEigentuemers, CODELISTE.bauherrOderEigentuemerArt);
  }
  if (data.artDesWohngebaeudes) {
    appendCodeElement(dba, "artDesWohngebaeudes", data.artDesWohngebaeudes, CODELISTE.wohngebaeudeArt);
  }
  if (data.artDesNichtwohngebaeudes) {
    appendCodeElement(dba, "artDesNichtwohngebaeudes", data.artDesNichtwohngebaeudes, CODELISTE.nichtwohngebaeudeArt);
  }
  if (data.ueberbauteFlaeche != null) {
    dba.ele(NS_XBAU, "ueberbauteFlaeche").txt(String(data.ueberbauteFlaeche));
  }
  if (data.datumAntragstellung) {
    dba.ele(NS_XBAU, "datumAntragstellung").txt(data.datumAntragstellung);
  }
  return dba;
}

/**
 * Append DatenBauueberhang (used by 0427).
 * XSD type: DatenBauueberhang
 */
export function appendDatenBauueberhang(parent, data) {
  const dbu = parent.ele(NS_XBAU, "datenBauueberhang");
  if (data.bauueberhang) {
    appendCodeElement(dbu, "bauueberhang", data.bauueberhang, CODELISTE.baufortschritt);
  }
  if (data.datumBaubeginn) {
    dbu.ele(NS_XBAU, "datumBaubeginn").txt(data.datumBaubeginn);
  }
  if (data.aktenbereinigungBaubeginn) {
    dbu.ele(NS_XBAU, "aktenbereinigungBaubeginn").txt("true");
  }
  if (data.datumUnterDach) {
    dbu.ele(NS_XBAU, "datumUnterDach").txt(data.datumUnterDach);
  }
  if (data.aktenbereinigungRohbau) {
    dbu.ele(NS_XBAU, "aktenbereinigungRohbau").txt("true");
  }
  if (data.datumBaufertigstellung) {
    dbu.ele(NS_XBAU, "datumBaufertigstellung").txt(data.datumBaufertigstellung);
  }
  if (data.aktenbereinigungBaufertigstellung) {
    dbu.ele(NS_XBAU, "aktenbereinigungBaufertigstellung").txt("true");
  }
  return dbu;
}
