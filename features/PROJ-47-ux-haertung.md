# PROJ-47: UX-Härtung (Sammelitem)

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** UX-Beobachtungen UX-2 bis UX-7, Kunden-Session 28.03.2026
**Prioritaet:** Major

---

## 1. Ziel / Problem

Die Kunden-Session zeigt sechs UX-Probleme die einzeln kleine Änderungen sind, aber zusammen die Nutzungsqualität erheblich beeinträchtigen. Dieses Sammelitem bündelt die UX-Härtung.

## 2. Fachlicher Kontext & Stakeholder

- **P1-P3:** Tägliche Nutzer, brauchen Effizienz und Fehlertoleranz
- **WCAG 2.2 AA:** Fokus-Indikator ist Pflicht (BITV 2.0)

## 4. User Stories & Akzeptanzkriterien

### US-1: Kommentar-Autoren als Name statt UUID (UX-2)
- AC-1: Kommentar-Autor wird als E-Mail-Adresse angezeigt statt UUID-Fragment
- AC-2: Wiederverwendbarer `useUserResolver`-Hook oder zentrale Email-Map

### US-2: Breadcrumb-Navigation (UX-3)
- AC-1: Breadcrumb auf Vorgang-Detailseite: "Vorgänge > [Aktenzeichen] > [Tab]"
- AC-2: shadcn/ui `Breadcrumb`-Komponente verwenden (bereits installiert)

### US-3: Statistik-Karten serverseitig (UX-4)
- AC-1: API `/api/vorgaenge` liefert aggregierte Zahlen (total, je Ampelstatus)
- AC-2: Statistik-Karten zeigen Gesamtzahlen, nicht nur aktuelle Seite

### US-4: Fokus-Indikator Vorgangsliste (UX-5, WCAG 2.4.7)
- AC-1: `focus-visible:ring-2` auf alle interaktiven Tabellenzeilen
- AC-2: Sort-Buttons im Header mit Focus-Styling

### US-5: Toast-Erfolgsbestätigung systemweit (UX-7)
- AC-1: `sonner`-Toast nach erfolgreicher Mutation (Vertretung, Kommentar, Frist, Workflow)
- AC-2: Konsistentes Pattern für alle Formulare

### US-6: Pause-Button-Label korrigieren (UX-6)
- AC-1: "Verfahren ruht" → "Verfahren pausieren" (Verb-Form)

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Breadcrumbs, Toast, Focus, User-Resolver
- **Senior Backend Developer:** Statistik-Aggregation in API

## 9. Abhaengigkeiten

- PROJ-3 (Vorgangsliste), PROJ-37 (Pause), PROJ-35 (Vertretung)

## 11. Scope / Nicht-Scope

**Scope:** Die 6 UX-Befunde aus der Session
**Nicht-Scope:** Neue Seiten/Routes, neue API-Endpunkte (außer Statistik-Erweiterung)
