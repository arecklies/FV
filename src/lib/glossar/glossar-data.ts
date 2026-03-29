/**
 * Fachbegriff-Glossar (PROJ-54)
 *
 * Statische Glossar-Daten fuer Bauordnungsrecht.
 * Quellen: LBO NRW, LBO BW, MBO.
 * Fachliche Pruefung gegen PDF-Quelldokumente unter Input/ erforderlich.
 */

export interface GlossarEintrag {
  /** Technischer Schluessel (lowercase, keine Umlaute) */
  id: string;
  /** Angezeigter Begriff */
  term: string;
  /** Kurzerklaerung (max. 200 Zeichen, 1-2 Saetze) */
  kurzerklaerung: string;
  /** Optionale ausfuehrliche Erklaerung */
  langerklaerung?: string;
  /** Optionales Beispiel */
  beispiel?: string;
  /** Bundeslaender-Einschraenkung (leer = alle) */
  bundeslaender?: string[];
}

/**
 * Glossar-Eintraege, alphabetisch sortiert nach `term`.
 * Mindestens 30 Eintraege (AC-2.6).
 */
export const GLOSSAR_EINTRAEGE: GlossarEintrag[] = [
  {
    id: "abstandsflaeche",
    term: "Abstandsfläche",
    kurzerklaerung: "Freizuhaltende Fläche zwischen einem Gebäude und der Grundstücksgrenze, deren Tiefe sich nach der Gebäudehöhe richtet.",
    langerklaerung: "Abstandsflächen dienen der Belichtung, Belüftung und dem Brandschutz. Die Tiefe beträgt je nach Bundesland 0,4 bis 1,0 H (H = Gebäudehöhe). In NRW gilt § 6 BauO NRW, in BW § 5 LBO BW.",
  },
  {
    id: "aktenzeichen",
    term: "Aktenzeichen",
    kurzerklaerung: "Eindeutige Kennung eines Vorgangs bei der Bauaufsichtsbehörde, unter der alle Dokumente und Schriftstücke geführt werden.",
  },
  {
    id: "auflagen",
    term: "Auflagen",
    kurzerklaerung: "Nebenbestimmungen zur Baugenehmigung, die der Bauherr zusätzlich erfüllen muss (z.B. Schallschutzmaßnahmen, Stellplatznachweis).",
    langerklaerung: "Auflagen werden im Genehmigungsbescheid festgelegt und sind rechtlich bindend. Bei Nichterfüllung kann die Baugenehmigung widerrufen werden.",
  },
  {
    id: "aussenbereich",
    term: "Außenbereich",
    kurzerklaerung: "Flächen außerhalb von Bebauungsplänen und zusammenhängend bebauten Ortsteilen. Bauen ist dort nur eingeschränkt zulässig (§ 35 BauGB).",
  },
  {
    id: "bauantrag",
    term: "Bauantrag",
    kurzerklaerung: "Förmlicher Antrag des Bauherrn auf Erteilung einer Baugenehmigung. Muss alle erforderlichen Bauvorlagen enthalten.",
  },
  {
    id: "baugenehmigung",
    term: "Baugenehmigung",
    kurzerklaerung: "Behördliche Erlaubnis zur Errichtung, Änderung oder Nutzungsänderung einer baulichen Anlage. Erteilt nach Prüfung der Bauvorlagen.",
    langerklaerung: "Die Baugenehmigung bestätigt, dass das Bauvorhaben den öffentlich-rechtlichen Vorschriften entspricht. Sie erlischt, wenn nicht innerhalb von 3 Jahren mit dem Bau begonnen wird.",
  },
  {
    id: "bauherr",
    term: "Bauherr",
    kurzerklaerung: "Person oder Organisation, die ein Bauvorhaben auf eigene Verantwortung vorbereitet und durchführt. Trägt die öffentlich-rechtliche Verantwortung.",
  },
  {
    id: "baulast",
    term: "Baulast",
    kurzerklaerung: "Freiwillige öffentlich-rechtliche Verpflichtung eines Grundstückseigentümers gegenüber der Bauaufsicht (z.B. Übernahme einer Abstandsfläche).",
    bundeslaender: ["NW"],
    langerklaerung: "Baulasten werden im Baulastenverzeichnis eingetragen und sind grundstücksbezogen. In BW gibt es stattdessen Grunddienstbarkeiten.",
  },
  {
    id: "bauleitplanung",
    term: "Bauleitplanung",
    kurzerklaerung: "Planerische Steuerung der Bodennutzung durch die Gemeinde. Umfasst Flächennutzungsplan (vorbereitend) und Bebauungsplan (verbindlich).",
  },
  {
    id: "bauvoranfrage",
    term: "Bauvoranfrage",
    kurzerklaerung: "Vorab-Anfrage zur Klärung einzelner Fragen der Zulässigkeit eines Bauvorhabens, bevor ein vollständiger Bauantrag gestellt wird.",
    langerklaerung: "Der Vorbescheid ist für 3 Jahre bindend. Er klärt z.B. ob ein Grundstück bebaubar ist oder ob eine bestimmte Nutzung zulässig wäre.",
  },
  {
    id: "bebauungsplan",
    term: "Bebauungsplan",
    kurzerklaerung: "Verbindlicher Bauleitplan der Gemeinde, der Art und Maß der baulichen Nutzung, Bauweise und überbaubare Grundstücksflächen festlegt (§ 30 BauGB).",
  },
  {
    id: "brandschutznachweis",
    term: "Brandschutznachweis",
    kurzerklaerung: "Bautechnischer Nachweis, dass ein Gebäude die Anforderungen an den baulichen Brandschutz erfüllt. Bei Sonderbauten durch Prüfingenieur zu prüfen.",
  },
  {
    id: "formelle-pruefung",
    term: "Formelle Prüfung",
    kurzerklaerung: "Erste Prüfung eines Bauantrags auf Vollständigkeit der Unterlagen und Zuständigkeit der Behörde. Keine inhaltliche Bewertung.",
    langerklaerung: "Die formelle Prüfung prüft: Sind alle Bauvorlagen eingereicht? Ist die Behörde zuständig? Ist der Antragsteller berechtigt? Bei Mängeln wird eine Nachforderung mit Frist versandt.",
  },
  {
    id: "freizeichnung",
    term: "Freizeichnung",
    kurzerklaerung: "Bestätigung, dass ein Bescheid oder Dokument geprüft und zur Versendung freigegeben wurde (Vier-Augen-Prinzip).",
  },
  {
    id: "frist-hemmung",
    term: "Frist-Hemmung",
    kurzerklaerung: "Zeitraum, in dem eine laufende Frist pausiert (z.B. während auf nachgeforderte Unterlagen gewartet wird). Die Restlaufzeit wird nach Ende der Hemmung fortgesetzt.",
  },
  {
    id: "gebrauchsabnahme",
    term: "Gebrauchsabnahme",
    kurzerklaerung: "Behördliche Abnahme vor Inbetriebnahme eines Gebäudes. Prüft ob das Bauvorhaben genehmigungskonform errichtet wurde.",
  },
  {
    id: "gebaeueklasse",
    term: "Gebäudeklasse",
    kurzerklaerung: "Einstufung eines Gebäudes nach Höhe und Nutzfläche (GK 1-5). Bestimmt die Anforderungen an Brandschutz, Standsicherheit und Rettungswege.",
    langerklaerung: "GK 1: Freistehende Gebäude bis 7m Höhe, max. 2 Nutzungseinheiten bis 400m². GK 5: Gebäude mit Fußbodenhöhe des höchsten Geschosses über 13m (Hochhausgrenze in manchen BL ab 22m).",
  },
  {
    id: "genehmigungsfreistellung",
    term: "Genehmigungsfreistellung",
    kurzerklaerung: "Vereinfachtes Verfahren für Vorhaben im Geltungsbereich eines qualifizierten Bebauungsplans. Kein Genehmigungsbescheid, aber Frist für Gemeinde-Einspruch.",
    bundeslaender: ["NW", "BW"],
    langerklaerung: "In NRW geregelt in § 63 BauO NRW, in BW in § 51 LBO BW. Das Vorhaben gilt als genehmigt, wenn die Gemeinde nicht innerhalb einer Frist widerspricht.",
  },
  {
    id: "innenbereich",
    term: "Innenbereich",
    kurzerklaerung: "Zusammenhängend bebauter Ortsteil ohne Bebauungsplan. Bauvorhaben müssen sich in die Umgebungsbebauung einfügen (§ 34 BauGB).",
  },
  {
    id: "kenntnisgabeverfahren",
    term: "Kenntnisgabeverfahren",
    kurzerklaerung: "Vereinfachtes Verfahren in NRW: Bauvorhaben wird der Behörde nur angezeigt, keine Genehmigung erforderlich. Gilt für einfache Wohngebäude im B-Plan-Gebiet.",
    bundeslaender: ["NW"],
    langerklaerung: "Geregelt in § 64 BauO NRW. Die Bauaufsicht prüft nicht, der Bauherr und der Entwurfsverfasser übernehmen die volle Verantwortung. Frist: 1 Monat nach Eingang.",
  },
  {
    id: "materielle-pruefung",
    term: "Materielle Prüfung",
    kurzerklaerung: "Inhaltliche Prüfung eines Bauantrags: Entspricht das Vorhaben dem Bauplanungsrecht, Bauordnungsrecht und sonstigen öffentlich-rechtlichen Vorschriften?",
    langerklaerung: "Die materielle Prüfung folgt auf die formelle Prüfung. Sie umfasst u.a.: Bebauungsplan-Konformität, Abstandsflächen, Brandschutz, Standsicherheit, Erschließung, Stellplätze.",
  },
  {
    id: "nachtrag",
    term: "Nachtrag",
    kurzerklaerung: "Änderung einer bereits erteilten Baugenehmigung (Tektur). Erforderlich wenn das Vorhaben wesentlich von der genehmigten Planung abweicht.",
  },
  {
    id: "nebenbestimmungen",
    term: "Nebenbestimmungen",
    kurzerklaerung: "Zusätzliche Regelungen im Genehmigungsbescheid: Auflagen, Bedingungen, Befristungen oder Widerrufsvorbehalte.",
  },
  {
    id: "nutzungsaenderung",
    term: "Nutzungsänderung",
    kurzerklaerung: "Änderung der Zweckbestimmung einer baulichen Anlage (z.B. Büro zu Wohnung). Genehmigungspflichtig wenn andere öffentlich-rechtliche Anforderungen gelten.",
  },
  {
    id: "rohbauabnahme",
    term: "Rohbauabnahme",
    kurzerklaerung: "Behördliche Abnahme nach Fertigstellung des Rohbaus. Prüft die Übereinstimmung mit der genehmigten Planung vor dem Innenausbau.",
  },
  {
    id: "sonderbau",
    term: "Sonderbau",
    kurzerklaerung: "Gebäude mit besonderer Nutzung oder Größe, für die verschärfte Anforderungen gelten (z.B. Versammlungsstätten, Hochhäuser, Krankenhäuser).",
    langerklaerung: "Die Definition variiert je Bundesland. In NRW sind Sonderbauten in § 50 BauO NRW aufgelistet. Sonderbauten durchlaufen immer das vollständige Genehmigungsverfahren.",
  },
  {
    id: "standsicherheitsnachweis",
    term: "Standsicherheitsnachweis",
    kurzerklaerung: "Bautechnischer Nachweis (Statik), dass ein Gebäude die auftretenden Lasten sicher abtragen kann. Bei GK 4-5 durch Prüfingenieur zu prüfen.",
  },
  {
    id: "tektur",
    term: "Tektur",
    kurzerklaerung: "Planänderung zu einem bereits eingereichten oder genehmigten Bauantrag. Betrifft einzelne Bauvorlagen, nicht den gesamten Antrag.",
  },
  {
    id: "toeb",
    term: "Träger öffentlicher Belange (TöB)",
    kurzerklaerung: "Behörden und Stellen, deren Aufgabenbereich von einem Bauvorhaben berührt wird und die im Verfahren angehört werden müssen (z.B. Brandschutz, Denkmalschutz).",
    langerklaerung: "Typische TöB: Untere Wasserbehörde, Untere Naturschutzbehörde, Denkmalschutzbehörde, Straßenverkehrsbehörde, Versorgungsunternehmen. Stellungnahmefristen: meist 4-8 Wochen.",
  },
  {
    id: "verfahrensart",
    term: "Verfahrensart",
    kurzerklaerung: "Art des baurechtlichen Genehmigungsverfahrens. Bestimmt den Prüfumfang der Behörde (z.B. vereinfachtes Verfahren, Sonderbauverfahren, Genehmigungsfreistellung).",
    langerklaerung: "Häufige Verfahrensarten in NRW: Genehmigungsfreistellung (§ 63), Einfaches Genehmigungsverfahren (§ 64), Vereinfachtes Genehmigungsverfahren (§ 68), Vollständiges Genehmigungsverfahren für Sonderbauten (§ 68 Abs. 1).",
  },
].sort((a, b) => a.term.localeCompare(b.term, "de"));

/** Schneller Lookup nach ID */
export const GLOSSAR_MAP = new Map<string, GlossarEintrag>(
  GLOSSAR_EINTRAEGE.map((e) => [e.id, e])
);

/** Suche in Glossar (case-insensitive, ueber term + kurzerklaerung + langerklaerung) */
export function sucheGlossar(suchbegriff: string, bundesland?: string): GlossarEintrag[] {
  const lower = suchbegriff.toLowerCase();
  return GLOSSAR_EINTRAEGE.filter((e) => {
    // Bundesland-Filter
    if (bundesland && e.bundeslaender?.length && !e.bundeslaender.includes(bundesland)) {
      return false;
    }
    // Textsuche
    return (
      e.term.toLowerCase().includes(lower) ||
      e.kurzerklaerung.toLowerCase().includes(lower) ||
      (e.langerklaerung?.toLowerCase().includes(lower) ?? false)
    );
  });
}
