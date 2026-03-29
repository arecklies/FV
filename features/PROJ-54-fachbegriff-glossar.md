# PROJ-54: Kontextbezogenes Fachbegriff-Glossar

**Status:** Deployed (Conditional: PROJ-60) | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Nutzertest Tag 2 (Berufseinsteiger), 14.05.2026 -- 5/6 Teilnehmer fordern Glossar
**Prioritaet:** Hoch (Pilotblocker fuer Berufseinsteiger und Quereinsteiger)

---

## 1. Ziel / Problem

Berufseinsteiger und Quereinsteiger verstehen zentrale Fachbegriffe der Baugenehmigung nicht (Verfahrensart, Gebaeueklasse, Sonderbau, ToEB, Genehmigungsfreistellung, formelle/materielle Pruefung). Im Nutzertest konnten 4/6 Einsteiger "Verfahrensart" nicht erklaeren, 5/6 verstanden "Genehmigungsfreistellung" nicht. Ohne kontextbezogene Erklaerungen ist die Software fuer Quereinsteiger ohne Begleitung nicht nutzbar.

Dieses Item ist eine fokussierte Extraktion aus PROJ-16 (Schulungskonzept und In-App-Onboarding, Phase 3). Das Glossar wird vorgezogen, weil es ein Pilotblocker fuer die Einsteiger-Zielgruppe ist und mit geringem Aufwand hohen Nutzen bringt.

## 2. Fachlicher Kontext & Stakeholder

- **Berufseinsteiger (Nutzertest Tag 2):** "Wenn die Software mir erklaert, was ein vereinfachtes Verfahren ist, dann lerne ich das DA"
- **IT-Quereinsteiger:** "Die Fachbegriffe sind wie eine Fremdsprache. Ein Glossar mit Mouseover waere Pflicht"
- **Referatsleiterin Soest:** "Wir haben seit zwei Jahren keinen vernuenftigen Einarbeitungsplan. Wenn die Software das schneller macht, hat das echten Wert fuer die Nachwuchsgewinnung"
- **PROJ-16 (Phase 3):** Umfassendes Schulungskonzept -- Glossar ist ein vorgezogener Teilaspekt

## 3. Funktionale Anforderungen

- FA-1: Fachbegriffe im UI mit Info-Icon (i) oder gestrichelter Unterstreichung markieren
- FA-2: Mouseover/Klick zeigt Kurzerklaerung (1-2 Saetze) in Tooltip oder Popover
- FA-3: Glossar-Daten als zentrale Datei (JSON oder TypeScript-Map), nicht in der Datenbank
- FA-4: Mindestens 30 Fachbegriffe zum Start (siehe Liste unter Annahmen)
- FA-5: Glossar-Eintraege sind bundeslandspezifisch wo noetig (z.B. "Kenntnisgabe" nur NRW)

## 4. User Stories & Akzeptanzkriterien

### MVP-Scope-Pruefung

3 User Stories. US-3 (Experten-Toggle) hat eigene UI-Interaktion und Persistenz (localStorage), daher separate Story. Kein Split in separate Items erforderlich.

### US-1: Fachbegriff per Tooltip im Kontext erklaert bekommen

**Als** Berufseinsteiger in der Bauordnungsbehoerde
**moechte ich** unbekannte Fachbegriffe direkt an der Stelle, wo sie im UI erscheinen, erklaert bekommen,
**damit** ich Vorgaenge bearbeiten kann, ohne Kollegen fragen zu muessen.

- AC-1.1: Fachbegriffe visuell markiert: gestrichelte Unterstreichung + Info-Icon (Lucide `info`, 14px). Dezente Farbe (`text-muted-foreground`)
- AC-1.2: Mouseover zeigt shadcn/ui Tooltip mit Kurzerklaerung (max. 2 Saetze, max. 200 Zeichen, Anzeige innerhalb 300ms)
- AC-1.3: Tooltip per Tastatur erreichbar: Tab-Fokus oeffnet, Escape schliesst (WCAG 2.2 AA, 1.4.13)
- AC-1.4: ARIA: `role="tooltip"` auf Tooltip, `aria-describedby` auf markiertem Begriff
- AC-1.5: Touch-Geraete: Tap oeffnet Tooltip, zweiter Tap oder Tap ausserhalb schliesst
- AC-1.6: Bundeslandspezifische Begriffe zeigen die Erklaerung des aktiven Bundeslandes. Ohne aktives BL: allgemeine Erklaerung
- AC-1.7: Mindestens 13 Begriffe erklaert (Prioritaet nach Nutzertest-Haeufigkeit):
  1. Genehmigungsfreistellung (5/6)
  2. Kenntnisgabeverfahren (5/6)
  3. ToEB / Traeger oeffentlicher Belange (5/6)
  4. Verfahrensart (4/6)
  5. Formelle Pruefung (4/6)
  6. Materielle Pruefung (4/6)
  7. Frist-Hemmung (4/6)
  8. Gebaeueklasse (3/6)
  9. Sonderbau (3/6)
  10. Freizeichnung (3/6)
  11. Nutzungsaenderung (2/6)
  12. Bauherr
  13. Aktenzeichen
- AC-1.8: GlossaryTerm-Wrapper nutzt ausschliesslich shadcn/ui Tooltip intern
- AC-1.9: Alle Erklaerungstexte fachlich korrekt und gegen LBO-Quelldokumente unter `Input/` verifiziert

### US-2: Glossar-Seite zum Nachschlagen aller Begriffe

**Als** Berufseinsteiger
**moechte ich** alle Fachbegriffe auf einer zentralen Seite alphabetisch nachschlagen koennen,
**damit** ich mich systematisch in die Fachsprache einarbeiten kann.

- AC-2.1: Unter Navigationspunkt "Hilfe" > "Glossar" erreichbar, alphabetisch sortiert
- AC-2.2: Jeder Eintrag: Begriff (fett), Kurzerklaerung, optional einklappbare Langerklaerung mit Beispiel. BL-spezifische Begriffe mit Badge (`[NRW]`, `[BW]`)
- AC-2.3: Suchfeld filtert in Echtzeit (clientseitig, debounced 200ms) ueber Begriff und Erklaerungstext
- AC-2.4: Ohne Bundesland-Kontext erreichbar -- alle BL-Begriffe mit Badge sichtbar
- AC-2.5: Druckbar: `@media print` blendet Navigation/Suchfeld aus, zeigt alle Eintraege (konsistent mit PROJ-42)
- AC-2.6: Mindestens 30 Eintraege (13 aus US-1 + 17 weitere: Baulast, Abstandsflaeche, Brandschutznachweis, Standsicherheitsnachweis, Auflagen, Nebenbestimmungen, Bauantrag, Baugenehmigung, Bauvoranfrage, Tektur, Nachtrag, Rohbauabnahme, Gebrauchsabnahme, Bauleitplanung, Bebauungsplan, Aussenbereich, Innenbereich)
- AC-2.7: Filterung < 100ms bei 100 Eintraegen

### US-3: Glossar-Markierungen ausblenden (Experten-Modus)

**Als** erfahrener Sachbearbeiter
**moechte ich** die Glossar-Markierungen ausblenden koennen,
**damit** mein Arbeitsbereich nicht ueberladen ist.

- AC-3.1: Toggle "Fachbegriff-Erklaerungen anzeigen" in Benutzereinstellungen (Default: an)
- AC-3.2: Ausgeschaltet: alle Markierungen verschwinden, Begriffe als normaler Text
- AC-3.3: Persistiert in `localStorage` (Key: `glossary-enabled`), ueberlebt Browser-Neustart
- AC-3.4: Glossar-Seite (US-2) bleibt unabhaengig von Toggle erreichbar
- AC-3.5: Toggle wirkt sofort (kein Page-Reload)

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Senior UI/UX Designer:** Toggle-Platzierung, Tooltip-Verhalten in Modals, visuelle Gewichtung der Markierung
- **Senior Frontend Developer:** GlossaryTerm-Komponente, GlossarProvider (Context + localStorage), Glossar-Seite, Print-CSS
- **Fachberater Bauordnungsrecht:** Fachliche Pruefung aller 30+ Erklaerungstexte gegen LBO-Quelldokumente

## 7. Offene Fragen

| # | Frage | Status | Antwort/Empfehlung |
|---|-------|--------|-------------------|
| 1 | Glossar ausschaltbar? | Beantwortet | Ja -- US-3 (localStorage-Toggle) |
| 2 | Bundeslandspezifisch? | Beantwortet | Ja -- AC-1.6 (BL-Tag, Fallback auf allgemein) |
| 3 | Wer pflegt Texte? | Offen | Erstbefuellung: Entwickler + LBO-Pruefung. Langfristig: PROJ-16 |
| 4 | Toggle-Platzierung? | Offen (UX) | Optionen: User-Menu, Footer, Glossar-Seite |
| 5 | Begriffe in Dialogen/Modals? | Offen (UX) | Empfehlung: Ja, wenn genug Platz |

## 8. Annahmen

- Glossar-Daten als statische TypeScript-Map in `src/lib/glossar/glossar-data.ts`
- Datenstruktur: `{ term: string, kurzerklaerung: string, langerklaerung?: string, beispiel?: string, bundeslaender?: string[] }`
- GlossaryTerm-Wrapper in `src/components/glossar/glossary-term.tsx`
- Glossar-Seite unter `src/app/glossar/page.tsx`
- Glossar-Praeferenz via React Context (`GlossarProvider`), gespeist aus `localStorage`
- Begriffe aus LBO-Quelldokumenten unter `Input/` abgeleitet
- Keine Personalisierung (alle sehen dasselbe Glossar, nur BL-spezifisch)

## 9. Abhaengigkeiten

- PROJ-16 (Schulungskonzept, Phase 3) -- Glossar ist vorgezogener Teilaspekt
- PROJ-44 (LBO BW) -- BW-spezifische Begriffe beruecksichtigen
- Keine technischen Abhaengigkeiten (rein Frontend, statische Daten)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| Fachlich falsche Erklaerungen | Falschlernen bei Einsteigern | Alle Texte gegen LBO-Quelldokumente pruefen |
| Begriffe sind bundeslandspezifisch | BW-Nutzer sehen NRW-Begriffe | Bundesland-Tag auf Glossar-Eintraegen |

## 11. Scope / Nicht-Scope

**Scope:** GlossaryTerm-Wrapper (shadcn/ui Tooltip), statische Glossar-Map (30+ Begriffe, BL-spezifisch), Glossar-Nachschlageseite (filterbar, druckbar), Experten-Toggle (localStorage), WCAG 2.2 AA, fachliche Verifikation gegen LBOs
**Nicht-Scope:** CMS/Admin-UI fuer Glossar-Pflege (PROJ-16), interaktive Tutorials (PROJ-16), Erklaervideos, kontextadaptives Onboarding, Volltextsuche-Integration (PROJ-49), DB-Speicherung, Personalisierung ("Begriff verstanden")
