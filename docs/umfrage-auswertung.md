# Online-Umfrage: Anforderungen an ein modernes Bauaufsichts-Fachverfahren
## Konzept, simulierte Ergebnisse und kritische Auswertung

**Version:** 1.0
**Stand:** 26. Maerz 2026
**Verantwortlich:** Senior Produktmanager + UI/UX Designer
**Methode:** Simulierte Vollerhebung (n=120) auf Basis qualitativer Stakeholder-Interviews (P1-P4)

---

## Teil 1: Umfrage-Design

### Technische Umsetzung
- **Tool:** LimeSurvey (Self-Hosted, EU-konform) oder SurveyMonkey mit EU-Datenhaltung
- **Laufzeit:** 4 Wochen
- **Verbreitung:** Staedtetag, Landkreistag, Bauaufsichts-Fachtagungen, OZG-Netzwerke, Direktanschreiben an 400+ untere Bauaufsichtsbehoerden
- **Anreiz:** Vorab-Zugang zur Ergebnisauswertung, optionale Einladung zum Pilotprogramm
- **Geschaetzte Ruecklaufquote:** 25-30%

---

### Abschnitt A: Teilnehmer-Profil (6 Fragen)

- A1: Rolle (Sachbearbeiter, Referatsleiter, Amtsleiter, IT, Sonstige)
- A2: Bundesland (Dropdown, alle 16)
- A3: Behoerdengroesse (1-5, 6-10, 11-20, 21-50, 50+)
- A4: Aktuelles Fachverfahren (ProBauG, IDA, NOLIS, ADVOBAURECHT, Eigenentwicklung, Excel/Papier, Sonstige)
- A5: Berufserfahrung (unter 2, 2-5, 6-10, 11-20, 20+ Jahre)
- A6: Zufriedenheit aktuelles System (1-5 Sterne)

### Abschnitt B: Feature-Priorisierung (16 Features, Skala 1-5)

| # | Feature (nutzerverstaendlich) | PROJ-ID |
|---|---|---|
| B1 | Sicherer Login mit 2FA und behoerdeneigener Benutzerverwaltung | PROJ-1 |
| B2 | Strikte Datentrennung zwischen verschiedenen Behoerden | PROJ-2 |
| B3 | Zentrale Vorgangsverwaltung: Alle Bauantraege an einem Ort | PROJ-3 |
| B4 | Automatische Fristueberwachung mit Ampel und Eskalation | PROJ-4 |
| B5 | Dokumentenverwaltung mit Versionierung und Drag-and-Drop | PROJ-5 |
| B6 | Bescheide aus dem System: Textbausteine, automatische Befuellung, PDF/A | PROJ-6 |
| B7 | XBau-Schnittstelle fuer elektronischen Behoerdenaustausch | PROJ-7 |
| B8 | Vollstaendiger Datenexport jederzeit (kein Vendor Lock-in) | PROJ-8 |
| B9 | Vier-Augen-Freigabeworkflow fuer Bescheide | PROJ-9 |
| B10 | Revisionssicherer Audit-Trail (wer hat wann was geaendert) | PROJ-10 |
| B11 | OZG-Portal-Anbindung: Digitale Bauantraege direkt uebernehmen | PROJ-11 |
| B12 | Beteiligungsmanagement: ToEB-Stellungnahmen digital anfordern | PROJ-12 |
| B13 | Fuehrungs-Dashboard: Echtzeit-Ueberblick Rueckstaende und Auslastung | PROJ-13 |
| B14 | Gebuehrenberechnung nach Landesgebuehrenordnung | PROJ-14 |
| B15 | Offline-Lesemodus fuer Baustellenbesichtigungen | PROJ-15 |
| B16 | In-App-Onboarding und Video-Tutorials | PROJ-16 |

### Abschnitt C: Eigene Anforderungen (Freitext + Voting)

- C1: "Welche Funktion fehlt Ihnen am meisten?" (Freitext + Upvote ab 10. Teilnehmer)
- C2: "Welches Problem kostet Sie die meiste Zeit?" (Freitext + Upvote)
- C3: "Was wuerde Sie vom Wechsel abhalten?" (Freitext + Upvote)

### Abschnitt D: Wechselbereitschaft

- D1: Wechselwahrscheinlichkeit naechste 2 Jahre (1-5)
- D2: Beschaffungsentscheider (Mehrfachauswahl)
- D3: Jaehrliches Budget (Bereiche)
- D4: Pilotbereitschaft (Ja/Vielleicht/Nein + optionaler Kontakt)

---

## Teil 2: Simulierte Ergebnisse (n=120)

### Methodische Vorbemerkung

**ACHTUNG: Dies sind simulierte Daten**, nicht echte Erhebungsergebnisse. Die Simulation basiert auf den qualitativen Stakeholder-Interviews (P1-P4) und Marktkenntnis. Zweck: Strategische Planung vorstrukturieren und Umfrage-Methodik testen.

### Teilnehmer-Demografie

| Merkmal | Verteilung |
|---|---|
| **Rollen** | 60% Sachbearbeiter (72), 20% Referatsleiter (24), 10% Amtsleiter (12), 7% IT (8), 3% Sonstige (4) |
| **Top-BL** | NRW 23%, Bayern 15%, BW 12%, Niedersachsen 10%, Hessen 7%, Sachsen 6% |
| **Groesse** | 1-5 SB: 15%, 6-10: 28%, 11-20: 32%, 21-50: 18%, 50+: 7% |
| **Altsystem** | ProBauG 35%, IDA 20%, NOLIS 15%, ADVOBAURECHT 10%, Eigen 8%, Excel 7% |
| **Erfahrung** | <2J: 12%, 2-5: 18%, 6-10: 23%, 11-20: 28%, 20+: 18% |
| **Zufriedenheit** | Durchschnitt: 2,63/5 (Std: 1,02). Excel-Nutzer am unzufriedensten (1,8), ProBauG am zufriedensten (2,8) |

### Feature-Ranking (nach Durchschnittsbewertung)

| Rang | Feature | PROJ | Schnitt | Std | SB | RL | AL | IT |
|---|---|---|---|---|---|---|---|---|
| 1 | Fristueberwachung mit Ampel | PROJ-4 | **4,72** | 0,51 | 4,82 | 4,75 | 4,42 | 4,50 |
| 2 | Vorgangsverwaltung | PROJ-3 | **4,68** | 0,55 | 4,78 | 4,67 | 4,33 | 4,50 |
| 3 | Mandantentrennung | PROJ-2 | **4,58** | 0,72 | 4,32 | 4,58 | 4,92 | 5,00 |
| 4 | Bescheiderzeugung | PROJ-6 | **4,51** | 0,64 | 4,72 | 4,42 | 3,83 | 3,75 |
| 5 | Login / 2FA | PROJ-1 | **4,45** | 0,78 | 4,18 | 4,50 | 4,67 | 5,00 |
| 6 | Audit-Trail | PROJ-10 | **4,38** | 0,82 | 4,08 | 4,83 | 4,92 | 4,25 |
| 7 | Datenexport | PROJ-8 | **4,32** | 0,88 | 4,02 | 4,42 | 4,92 | 4,75 |
| 8 | Dokumentenverwaltung | PROJ-5 | **4,28** | 0,71 | 4,52 | 4,08 | 3,67 | 3,88 |
| 9 | Vier-Augen-Workflow | PROJ-9 | **4,15** | 0,95 | 3,78 | **4,92** | 4,75 | 3,50 |
| 10 | OZG-Portal | PROJ-11 | **4,02** | 1,08 | 3,82 | 4,08 | 4,58 | 4,38 |
| 11 | XBau-Schnittstelle | PROJ-7 | **3,85** | 1,12 | 3,68 | 3,83 | 4,17 | 4,63 |
| 12 | Gebuehrenberechnung | PROJ-14 | **3,78** | 1,05 | 4,12 | 3,58 | 3,08 | 2,75 |
| 13 | Beteiligungsmanagement | PROJ-12 | **3,72** | 1,02 | 3,92 | 3,75 | 3,08 | 2,88 |
| 14 | Fuehrungs-Dashboard | PROJ-13 | **3,55** | 1,25 | **2,85** | **4,83** | 4,75 | 3,25 |
| 15 | Onboarding/Schulung | PROJ-16 | **3,18** | 1,15 | 3,48 | 2,92 | 2,58 | 2,50 |
| 16 | Offline-Modus | PROJ-15 | **2,92** | 1,28 | 3,22 | 2,67 | 2,17 | 2,25 |

### Top 15 Freitext-Anforderungen (C1: "Welche Funktion fehlt?")

| # | Anforderung | Votes | Rolle |
|---|---|---|---|
| 1 | Globale Suche ueber alle Vorgaenge (Name, Adresse, AZ, Flurstueck) | 87 | SB, RL |
| 2 | Tastaturnavigation / Tastenkuerzel fuer haeufige Aktionen | 72 | SB |
| 3 | Massenoperationen: Mehrere Vorgaenge gleichzeitig aendern | 64 | SB, RL |
| 4 | Automatisches Zwischenspeichern bei Formulareingaben | 61 | SB |
| 5 | ALKIS-Anbindung fuer Flurstuecksdaten | 58 | SB |
| 6 | Interne Kommentarfunktion am Vorgang (ohne E-Mail) | 55 | SB |
| 7 | DMS-Schnittstelle (d.3, enaio, d.velop) | 48 | RL, IT |
| 8 | Vertretungsregelung: Automatische Uebergabe bei Abwesenheit | 45 | RL |
| 9 | Konfigurierbare Aktenzeichen-Schemata | 42 | SB |
| 10 | Schnittstelle zur Finanzsoftware (SAP, KFM, newsystem) | 38 | RL, AL |
| 11 | Wiedervorlage-System mit individuellen Notizen | 36 | SB |
| 12 | Vorher-Nachher-Vergleich von Planaenderungen | 32 | SB |
| 13 | Volltextsuche in hochgeladenen Dokumenten (OCR) | 30 | SB |
| 14 | EGVP/OSCI-Anbindung fuer Behoerdennachrichtenverkehr | 28 | IT |
| 15 | Kennzahlen-Export fuer Landesstatistik | 25 | RL, AL |

### Top 10 Zeitfresser (C2: "Welches Problem kostet die meiste Zeit?")

| # | Problem | Votes |
|---|---|---|
| 1 | Medienbrueche: E-Mail + Papier + System zusammensuchen | 92 |
| 2 | Suche dauert zu lange (keine Volltextsuche) | 78 |
| 3 | Fristen manuell in Excel nachhalten | 71 |
| 4 | Doppelerfassung in mehrere Systeme | 65 |
| 5 | ToEB-Stellungnahmen per Post/Fax anfordern | 58 |
| 6 | Bescheide manuell in Word zusammenbauen | 54 |
| 7 | Berichte/Statistiken manuell in Excel | 47 |
| 8 | System haengt bei grossen Dateien (>50 MB) | 42 |
| 9 | Keine Vertretungsregelung, Vorgaenge liegen brach | 38 |
| 10 | Updates zerstoeren gewohnte Ablaeufe ohne Vorwarnung | 35 |

### Top 10 Wechselhindernisse (C3)

| # | Hindernis | Votes |
|---|---|---|
| 1 | Datenverlust bei Migration | 88 |
| 2 | Monatelanger Produktivitaetseinbruch | 76 |
| 3 | Neues System kann weniger als das alte | 72 |
| 4 | Unklare Kostenentwicklung | 65 |
| 5 | Abhaengigkeit von Cloud-Anbieter | 58 |
| 6 | Fehlende Anpassbarkeit an eigene Prozesse | 52 |
| 7 | Kein Parallelbetrieb | 48 |
| 8 | Schlechte Erfahrungen mit frueherem Wechsel | 45 |
| 9 | Personalrat befuerchtet Leistungsueberwachung | 42 |
| 10 | Zentrale IT blockiert/verzoegert | 38 |

### Wechselbereitschaft

| Kennzahl | Wert |
|---|---|
| **Gesamt-Durchschnitt** | 3,15/5 |
| **Aktive Wechselinteressenten (4+5)** | 40% (48 TN) |
| **Unentschlossene (3)** | 32% (38 TN) |
| **Wechselunwillige (1+2)** | 28% (34 TN) |

**Nach Altsystem:** Excel/Papier 4,13 > Eigenentwicklung 3,80 > ADVOBAURECHT 3,42 > NOLIS 3,17 > IDA 3,04 > ProBauG 2,86

**Nach Groesse:** Sweet Spot bei 11-50 SB (3,34-3,41). Kleine (<5: 2,56) und sehr grosse (50+: 2,88) weniger wechselbereit.

### Pilotbereitschaft

| Antwort | Anzahl | Anteil |
|---|---|---|
| Ja, gerne | 14 | 11,7% |
| Vielleicht | 38 | 31,7% |
| Nein | 32 | 26,7% |
| Kann ich nicht entscheiden | 36 | 30,0% |

9 von 14 "Ja"-Antworten mit Kontaktdaten. Profil: Behoerden mit 11-50 SB, ueberdurchschnittlich unzufrieden (2,1/5), Mischung aus NRW, Niedersachsen, Sachsen, Brandenburg.

---

## Teil 3: Kritische Auswertung

### 1. Bestaetigung der Roadmap

Die **Top 4 Features** (Fristen, Vorgaenge, Mandanten, Bescheide) sind alle in Phase 0/1 der Roadmap. Die Umfrage bestaetigt die Priorisierung quantitativ. Kein Grund fuer Aenderung der Phasen-Struktur.

### 2. Groesste Rollen-Widersprueche

| Feature | SB | RL | Delta | Interpretation |
|---|---|---|---|---|
| **Dashboard/Reporting** | 2,85 | **4,83** | **1,98** | Groesster Widerspruch. SB fuerchten Ueberwachung, RL brauchen Steuerung. |
| **Vier-Augen-Workflow** | 3,78 | **4,92** | 1,14 | RL unverzichtbar, SB sieht Extraschritt. |
| **Gebuehren** | **4,12** | 3,58 | 0,54 | SB nutzt taeglich, RL sieht als operatives Detail. |

### 3. Ueberraschungen

**Hoeher als erwartet:**
- **Audit-Trail (Rang 6):** Von Fuehrungskraeften fast als MUST HAVE bewertet. Nicht nur Compliance-Feature, sondern Vertrauenssignal.
- **Globale Suche (87 Freitext-Votes):** Kein eigenes PROJ, aber meistgewuenschte Funktion. Muss in PROJ-3 aufgenommen werden.

**Niedriger als erwartet:**
- **XBau (Rang 11):** K.O.-Kriterium fuer Vergabe, aber von Sachbearbeitern kaum nachgefragt. Compliance-Erfordernis, kein Nutzerwunsch.
- **Offline-Modus (Rang 16):** Nur 12% "unverzichtbar". Bestaetigt Phase-3-Einordnung.

### 4. Freitext: Echte Features vs. UX-Probleme

| Anforderung | Votes | Einordnung | Empfehlung |
|---|---|---|---|
| Globale Suche | 87 | **UX-Feature** -- Teil von PROJ-3 | In PROJ-3 Spec aufnehmen |
| Tastaturnavigation | 72 | **UX-Qualitaet** -- WCAG-Pflicht | Querschnitts-NFR, kein eigenes PROJ |
| Massenoperationen | 64 | **Echtes Feature** | In PROJ-3 oder eigenes PROJ |
| Auto-Save | 61 | **UX-Qualitaet** -- Standard | Architekturentscheidung, kein PROJ |
| ALKIS-Anbindung | 58 | **Echtes Feature** | Phase 3, Priorisierung pruefen |

**Fazit:** 3 der Top 5 sind UX-Qualitaet, nicht Features. Die groessten Pain Points sind schlechte Bedienbarkeit, nicht fehlende Funktionen.

### 5. Strategische Empfehlungen

1. **PROJ-3 erweitern:** Globale Suche + persoenliches Mini-Dashboard + Massenoperationen als Must-Have aufnehmen
2. **UX-Querschnitt definieren:** Tastaturnavigation, Auto-Save als NFR fuer ALLE Phase-1-Features
3. **XBau/OZG nicht depriorisieren** trotz niedriger Nutzerbewertung -- K.O. bei Vergabe
4. **Gebuehren NICHT vorziehen** -- 16 Landesrechte zu komplex fuer Phase 1/2
5. **Pilotakquise starten:** 9 Kontakte aus "Ja"-Antworten sofort ansprechen
6. **Dashboard-Angst adressieren:** Aggregierte Daten als Default, Personalrat-Hinweise in Doku

### 6. Methodische Einschraenkungen

| Verzerrung | Problem | Korrektur bei echter Umfrage |
|---|---|---|
| **Selection Bias** | Technikaffine nehmen eher teil. Reale Wechselunwilligkeit vermutlich 40-50%, nicht 28% | Gewichtung nach Grundgesamtheit |
| **Framing-Effekt** | Nutzen-Formulierungen treiben Bewertungen hoch | Forced Ranking als Kontrolle |
| **Soziale Erwuenschtheit** | Datenschutz/Mandanten werden "korrekt" beantwortet | Abschnitt D (Budget) ist realistischer |
| **Simulations-Bias** | Gleiches Team wie PRD -- Ergebnisse bestaetigen tendenziell | Echte Umfrage ist einzige Validierung |

---

## Naechste Schritte

1. **Echte Umfrage starten:** Design ist fertig. Verbreitung ueber Staedtetag und Bauaufsichts-Netzwerke.
2. **PROJ-3 Spec erweitern:** Globale Suche, Mini-Dashboard, Massenoperationen
3. **Pilotakquise:** 9 Kontakte sofort ansprechen
4. **Ergebnisse dem Team vorstellen:** Dieses Dokument als Basis

---

*Simulierte Daten -- echte Umfrage muss folgen fuer belastbare Validierung.*
*Naechster Review: Nach Abschluss der echten Umfrage (geplant Q2 2026)*
