# PROJ-52: Interne Vorgang-Notizen (privat)

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Nutzertest Afterwork 14.05.2026, Ralf Meier (Dortmund, P1-DO1)

---

## 1. Ziel / Problem

Sachbearbeiter wollen sich Dinge zu einem Vorgang merken, die nicht in die formelle Akte gehoeren -- z.B. "Bauherr hat telefonisch angekuendigt, Unterlagen nachzureichen" oder "Ruecksprache mit Kollege X halten". Die bestehende Kommentar-Funktion (PROJ-3 US-4) ist fuer formelle, sichtbare Kommentare gedacht. Es fehlt eine Moeglichkeit fuer private Notizen, die nur der Verfasser sieht.

## 2. Fachlicher Kontext & Stakeholder

- **Erfahrene Sachbearbeiter (Dortmund):** Nutzen aktuell Post-Its, Outlook-Notizen oder Papierkram neben der Software
- **Referatsleiter:** Wollen ggf. Notizen der Vertretung sehen, wenn sie ein Verfahren uebernehmen
- **Datenschutz:** Private Notizen unterliegen nicht der Aktenpflicht, muessen aber bei DSGVO-Auskunft beruecksichtigt werden

## 3. Funktionale Anforderungen

- FA-1: Neuer Notiz-Typ "privat" auf bestehender Kommentar-Infrastruktur
- FA-2: Private Notizen sind nur fuer den Ersteller sichtbar (RLS-gestuetzt)
- FA-3: Optionale Sichtbarkeit fuer Vertretung (Vertretungsregel aus PROJ-35)
- FA-4: Private Notizen visuell unterscheidbar von formellen Kommentaren (z.B. Icon, Hintergrundfarbe)

## 4. User Stories & Akzeptanzkriterien

### US-1: Private Notiz erstellen
Als Sachbearbeiter moechte ich eine private Notiz zu einem Vorgang hinterlegen, die nur ich sehen kann.
- AC-1: Im Kommentar-Bereich gibt es einen Toggle "Privat / Fuer alle"
- AC-2: Private Notizen werden mit einem Schloss-Icon und anderem Hintergrund angezeigt
- AC-3: Private Notizen sind nur fuer den Ersteller in der Kommentarliste sichtbar (RLS)
- AC-4: Formelle Kommentare bleiben unveraendert (kein Regression)

### US-2: Vertretungszugriff auf Notizen
Als Vertretung moechte ich die privaten Notizen meines Kollegen sehen, wenn ich einen Vorgang uebernehme.
- AC-1: Wenn Vertretungsregel aktiv (PROJ-35), sind private Notizen des Vertretenen sichtbar
- AC-2: Sichtbarkeit endet, wenn Vertretung aufgehoben wird

## 5. Nicht-funktionale Anforderungen

- Ausgabe von `/req-nfr` wird hier eingefuegt.

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Toggle-UI, visuelle Unterscheidung
- **Senior Backend Developer:** RLS-Policy fuer private Notizen, Vertretungslogik

## 7. Offene Fragen

- Sollen private Notizen bei DSGVO-Auskunftsanfragen exportiert werden?
- Sollen private Notizen loeschbar sein (Soft-Delete oder Hard-Delete)?

## 8. Annahmen

- Bestehende Kommentar-Tabelle und API (PROJ-3) werden erweitert, nicht neu gebaut
- RLS kann ueber `created_by = auth.uid()` die Sichtbarkeit steuern

## 9. Abhaengigkeiten

- PROJ-3 (Vorgangsverwaltung, Kommentare) -- Deployed
- PROJ-35 (Vertretungsregelung) -- Deployed
- PROJ-41 (Loeschkonzept DSGVO) -- Planned (Wechselwirkung bei Auskunftsrecht)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|--------|-----------|----------------|
| DSGVO-Auskunftsrecht umfasst private Notizen | Unvollstaendige Auskunft | Klaerung mit Datenschutzbeauftragtem vor Implementierung |
| Notizen werden als Aktenbestandteil interpretiert | Rechtliche Konsequenz | Klare Kennzeichnung "Nicht aktenrelevant" |

## 11. Scope / Nicht-Scope

**Scope:** Privat-Flag auf Kommentaren, RLS fuer Sichtbarkeit, Vertretungszugriff
**Nicht-Scope:** Geteilte Notizen (Team-Notizen), Notiz-Kategorien, Dateianhang an Notiz
