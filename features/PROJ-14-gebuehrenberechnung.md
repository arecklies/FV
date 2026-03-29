# PROJ-14: Gebuehrenberechnung nach Landesrecht

**Status:** Planned | **Phase:** 3 (Fuehrung und Optimierung) | **Erstellt:** 2026-03-25
**Letzte Aktualisierung:** 2026-03-29
**Herkunft:** Roadmap Phase 3 + Nutzertest Afterwork (Thomas, Soest: "Die Kollegin von der Kasse fragt mich staendig")
**Prioritaet:** Mittel (wuenschenswert, kein Pilotblocker -- aktuell manuell via Excel/Kassensystem)

---

## 1. Ziel / Problem

Sachbearbeiter muessen Baugebuehren manuell berechnen (Excel-Tabellen, Taschenrechner) und separat an die Kasse uebermitteln. Die Berechnung ist fehleranfaellig, da sie von Verfahrensart, Bundesland, Rohbauwert, Sonderfaktoren und jaehrlich aktualisierten Kostenkennwerten abhaengt. Das System soll die Gebuehr automatisch berechnen, am Vorgang speichern und im Gebuehrenbescheid referenzierbar machen.

## 2. Fachlicher Kontext & Stakeholder

- **Sachbearbeiter:** Muessen aktuell manuell rechnen, fehleranfaellig bei komplexen Vorhaben
- **Kasse/Buchhaltung:** Erhaelt Gebuehrenbescheid, braucht korrekte Betraege mit Rechtsgrundlage
- **Bauherr:** Erhaelt Gebuehrenbescheid, kann Widerspruch einlegen bei falscher Berechnung
- **Afterwork-Feedback Thomas (Soest):** "Die Kollegin von der Kasse fragt mich staendig nach der Grundgebuehr"
- **Nutzertest Tag 1:** 2/8 Bestandskunden bewerten als wuenschenswert (kein Blocker fuer Migration)

### Rechtsgrundlagen

| Bundesland | Gebuehrengesetz | Baugebuehrenordnung | Besonderheit |
|------------|----------------|---------------------|-------------|
| NRW | AllgGebG NRW | BauGebO NRW (Anlage zu § 1) | Rohbauwert-basiert, Kostenkennwerte nach BKI |
| BW | LGebG BW | GebVO Baurechtsamt BW | Aehnliches Prinzip, andere Saetze und Schwellenwerte |

### Berechnungslogik (vereinfacht)

```
Grundgebuehr = Rohbauwert x Gebuehrensatz
Rohbauwert   = Bruttorauminhalt (BRI in m³) x Kostenkennwert (EUR/m³)
```

- **Kostenkennwert:** Abhaengig von Nutzungsart (Wohnen, Gewerbe, Industrie etc.), jaehrlich aktualisiert
- **Gebuehrensatz:** Abhaengig von Verfahrensart (Baugenehmigung, Vorbescheid, Teilbaugenehmigung etc.)
- **Mindestgebuehr / Hoechstgebuehr:** Je Bundesland unterschiedlich
- **Nebengebuehren:** Pruefung Standsicherheit, Brandschutz, Schallschutz (separate Positionen)
- **Ermaessigungen:** Z.B. bei Wohnungsbau, oeffentlichen Bauherren, sozialen Einrichtungen
- **Gebuehrenbefreiung:** Oeffentliche Bauherren, Kirchen, Sozialeinrichtungen (je BL unterschiedlich)

## 3. Funktionale Anforderungen

- FA-1: Automatische Berechnung der Grundgebuehr basierend auf BRI, Nutzungsart, Verfahrensart und Bundesland
- FA-2: Kostenkennwert-Tabelle pro Bundesland und Nutzungsart (jaehrlich aktualisierbar)
- FA-3: Gebuehrensatz-Tabelle pro Bundesland und Verfahrensart
- FA-4: Mindest- und Hoechstgebuehr pro Bundesland
- FA-5: Nebengebuehren als separate Positionen (Pruefgebuehren, Auslagenersatz)
- FA-6: Ermaessigungen und Befreiungen konfigurierbar
- FA-7: Gebuehrenberechnung am Vorgang speichern (Gesamtbetrag + Einzelpositionen)
- FA-8: Gebuehrenhistorie (Neuberechnung bei Planungsaenderung nachvollziehbar)
- FA-9: Export/Schnittstelle fuer Kassensystem (mindestens CSV, optional DMS-Anbindung)
- FA-10: Gebuehr im Gebuehrenbescheid referenzierbar (PROJ-6)

## 4. User Stories & Akzeptanzkriterien

### US-1: Gebuehr automatisch berechnen
Als Sachbearbeiter moechte ich die Baugebuehr automatisch berechnen lassen, damit ich keine manuellen Berechnungsfehler mache.
- AC-1: Im Vorgang gibt es einen Tab/Abschnitt "Gebuehren"
- AC-2: System berechnet Grundgebuehr aus BRI x Kostenkennwert x Gebuehrensatz
- AC-3: Fehlende Eingabewerte (BRI, Nutzungsart) werden als Pflichtfelder angefordert
- AC-4: Ergebnis zeigt: Grundgebuehr, Nebengebuehren (Einzelpositionen), Gesamtbetrag
- AC-5: Rechtsgrundlage wird automatisch angegeben (z.B. "§ 1 Abs. 1 BauGebO NRW i.V.m. Tarifstelle 2.4.1.1")

### US-2: Kostenkennwerte pflegen
Als Administrator moechte ich die jaehrlich aktualisierten Kostenkennwerte einpflegen, damit die Berechnung aktuell bleibt.
- AC-1: Admin-Oberflaeche fuer Kostenkennwert-Tabelle (pro Bundesland, Nutzungsart, Jahr)
- AC-2: Import via CSV moeglich
- AC-3: Historische Werte bleiben erhalten (Nachvollziehbarkeit)
- AC-4: Neue Kostenkennwerte gelten erst ab dem konfigurierten Stichtag

### US-3: Gebuehrenbescheid vorbereiten
Als Sachbearbeiter moechte ich die berechnete Gebuehr in den Gebuehrenbescheid uebernehmen.
- AC-1: Button "Gebuehrenbescheid erstellen" im Gebuehren-Tab
- AC-2: Bescheid enthaelt alle Positionen mit Rechtsgrundlage
- AC-3: Bescheid ist druckbar (Print-CSS) und als PDF exportierbar (PROJ-6)

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Database Architect:** Neue Tabellen fuer Kostenkennwerte, Gebuehrensaetze, Gebuehrenpositionen
- **Senior Backend Developer:** Berechnungslogik, Validierung, API-Endpunkte
- **Senior Frontend Developer:** Gebuehren-Tab, Admin-UI fuer Kostenkennwerte
- **Senior Security Engineer:** Gebuehrendaten sind finanzsensibel -- Audit-Trail Pflicht
- **Technical Writer:** Gebuehrentarif-Dokumentation je Bundesland

## 7. Offene Fragen

| # | Frage | Status |
|---|-------|--------|
| 1 | Welche Bundeslaender im MVP? Nur NRW + BW oder alle 16? | Offen |
| 2 | Schnittstelle zu Kassensystemen (SAP, MACH, Infoma)? Welches Format? | Offen |
| 3 | Sollen Gebuehren mandantenspezifisch konfigurierbar sein (Zuschlaege, Ermaessigungen)? | Offen |
| 4 | Wie werden Nachtragsgenehmigungen gebuehrenmaessig behandelt? | Offen |
| 5 | Automatische Mahnungen bei unbezahlten Gebuehren? | Offen (wahrscheinlich Nicht-Scope) |

## 8. Annahmen

- Kostenkennwerte werden jaehrlich durch den Mandanten-Admin eingepflegt (kein automatischer Import)
- Gebuehrenberechnung ist KEIN Pilotblocker -- aktuell manuell via Excel/Kassensystem
- Mindest-MVP: Grundgebuehr NRW berechnen, am Vorgang speichern, als Position im Bescheid
- Nebengebuehren und Ermaessigungen koennen iterativ ergaenzt werden

## 9. Abhaengigkeiten

| Abhaengigkeit | Typ | Status |
|---------------|-----|--------|
| PROJ-6 (Bescheiderzeugung) | Gebuehrenbescheid als Dokument | Planned |
| PROJ-3 (Vorgangsverwaltung) | Vorgang als Traeger der Gebuehrendaten | Deployed |
| PROJ-2 (Mandanten-Schema) | Mandantenspezifische Gebuehrentabellen | Planned |
| PROJ-10 (Audit-Trail) | Gebuehrenberechnung muss revisionssicher protokolliert werden | Planned |

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Falsche Gebuehrenberechnung | Widerspruchsverfahren, Vertrauensverlust | Alle Formeln gegen BauGebO pruefen, Vergleich mit manueller Berechnung |
| Kostenkennwerte nicht rechtzeitig aktualisiert | Falsche Betraege im neuen Jahr | Erinnerungsfunktion fuer Admin, Warnhinweis bei veralteten Werten |
| Bundeslandspezifische Sonderregelungen uebersehen | Inkorrekte Berechnung fuer einzelne BL | Fachliche Pruefung je BL durch lokalen Experten |
| Kassensystem-Schnittstelle inkompatibel | Manuelle Nacherfassung in der Kasse | Standard-Export (CSV), spezifische Formate on demand |

## 11. Scope / Nicht-Scope

**Scope:**
- Grundgebuehr-Berechnung (BRI x Kostenkennwert x Gebuehrensatz)
- Kostenkennwert- und Gebuehrensatz-Tabellen (Admin-pflegbar)
- Mindest-/Hoechstgebuehr
- Gebuehren am Vorgang speichern (Einzelpositionen + Gesamt)
- NRW + BW im MVP
- Gebuehrenposition im Bescheid referenzierbar (PROJ-6)

**Nicht-Scope:**
- Kassensystem-Schnittstelle (SAP, MACH) -- spaeteres Item
- Automatische Mahnungen/Zahlungsueberwachung
- Ratenzahlung/Stundung
- Gebuehren fuer Nicht-Bauverfahren (Ordnungsverfuegungen, Baulasten)
- Steuerliche Aspekte (Umsatzsteuer auf Gebuehren -- in den meisten BL nicht relevant)
