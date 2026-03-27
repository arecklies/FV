# PROJ-47: UX-Härtung (Sammelitem)

**Status:** In Progress | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-28
**Herkunft:** UX-Beobachtungen UX-2 bis UX-7, Kunden-Session 28.03.2026
**Prioritaet:** Major

---

## 1. Ziel / Problem

Die Kunden-Session zeigt sechs UX-Probleme die einzeln kleine Aenderungen sind, aber zusammen die Nutzungsqualitaet erheblich beeintraechtigen. Dieses Sammelitem buendelt die UX-Haertung.

## 2. Fachlicher Kontext & Stakeholder

- **P1-P3:** Taegliche Nutzer, brauchen Effizienz und Fehlertoleranz
- **WCAG 2.2 AA:** Fokus-Indikator ist Pflicht (BITV 2.0, Kriterium 2.4.7)
- **MVP-Scope-Hinweis:** 6 Stories, aber alle UI/UX-Verbesserungen ohne neue Entitaeten. PO hat Buendelung bestaetigt.

## 3. Funktionale Anforderungen

- FA-1: Kommentar-Autoren als E-Mail statt UUID
- FA-2: Breadcrumb-Navigation auf Vorgang-Detailseite
- FA-3: Statistik-Karten mit serverseitigen Gesamtzahlen
- FA-4: Fokus-Indikator auf interaktiven Tabellenzeilen
- FA-5: Toast-Erfolgsbestaetigung nach Mutationen
- FA-6: Pause-Button-Label korrigieren

## 4. User Stories & Akzeptanzkriterien

### US-1: Kommentar-Autoren als Name statt UUID (UX-2)

**Als** Sachbearbeiter **moechte ich** sehen, wer einen Kommentar geschrieben hat (E-Mail statt UUID-Fragment), **damit** ich weiss, an wen ich mich wenden kann.

Aktuell: `{k.autor_user_id.slice(0, 8)}...` in `src/app/vorgaenge/[id]/page.tsx` Zeile 685.

- AC-1: Kommentar-Autor wird als E-Mail-Adresse angezeigt (z.B. "mueller@freiburg.de") statt UUID-Fragment
- AC-2: Backend-API `GET /api/vorgaenge/[id]/kommentare` liefert `autor_email` neben `autor_user_id` (Service-Role-Query auf `auth.users`)
- AC-3: Fallback bei fehlender E-Mail: UUID-Fragment wie bisher (kein Crash)
- AC-4: E-Mail-Aufloesung erfolgt serverseitig (kein Client-Zugriff auf auth.users)
- AC-5: Workflow-Historie zeigt ebenfalls E-Mail statt UUID fuer `ausgefuehrt_von`

### US-2: Breadcrumb-Navigation (UX-3)

**Als** Sachbearbeiter **moechte ich** auf der Vorgang-Detailseite eine Breadcrumb-Navigation sehen, **damit** ich weiss, wo ich mich befinde und schnell zuruecknavigieren kann.

Aktuell: Einfacher "Zurueck zur Liste"-Button (`src/app/vorgaenge/[id]/page.tsx` Zeile 440-446).

- AC-1: Breadcrumb auf Vorgang-Detailseite: "Vorgaenge > [Aktenzeichen]"
- AC-2: shadcn/ui `Breadcrumb`-Komponente verwenden (bereits unter `src/components/ui/breadcrumb.tsx` installiert)
- AC-3: "Vorgaenge" ist ein klickbarer Link zu `/vorgaenge`
- AC-4: Aktenzeichen ist die aktuelle Seite (nicht klickbar, `BreadcrumbPage`)
- AC-5: Der bisherige "Zurueck zur Liste"-Button entfaellt (ersetzt durch Breadcrumb)

### US-3: Statistik-Karten serverseitig (UX-4)

**Als** Sachbearbeiter **moechte ich** auf der Vorgangsliste Gesamtstatistiken sehen, **damit** ich einen Ueberblick ueber alle Vorgaenge habe — nicht nur die aktuelle Seite.

Aktuell: Statistik-Karten existieren (`src/app/vorgaenge/page.tsx` Zeile 227-265), zaehlen aber clientseitig aus der aktuellen Seite.

- AC-1: API `GET /api/vorgaenge` liefert zusaetzlich `statistik: { gesamt, gefaehrdet, ueberfaellig, im_zeitplan }` als aggregierte Zahlen ueber ALLE Vorgaenge (nicht nur aktuelle Seite)
- AC-2: Statistik-Karten verwenden die serverseitigen Zahlen statt Client-Zaehlung
- AC-3: Bei Seitennavigation aendern sich die Statistik-Zahlen NICHT (da sie global sind)
- AC-4: Statistik-Query beruecksichtigt nur aktive Vorgaenge (`deleted_at IS NULL`)
- AC-5: Loading-State fuer Statistik-Karten (Skeleton waehrend Laden)

### US-4: Fokus-Indikator Vorgangsliste (UX-5, WCAG 2.4.7)

**Als** Tastaturnutzer **moechte ich** sehen, welche Tabellenzeile fokussiert ist, **damit** ich die Liste per Tastatur navigieren kann.

Aktuell: `tabIndex={0}`, `onKeyDown` und `role="link"` vorhanden, aber kein visueller Fokus-Indikator.

- AC-1: Tabellenzeilen haben `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- AC-2: Focus-Ring ist nur bei Tastaturnavigation sichtbar (nicht bei Mausklick)
- AC-3: Sort-Buttons im Tabellenkopf haben ebenfalls Focus-Styling
- AC-4: Focus-Indikator wird nicht von Sticky-Headern verdeckt (WCAG 2.4.11)

### US-5: Toast-Erfolgsbestaetigung systemweit (UX-7)

**Als** Sachbearbeiter **moechte ich** nach erfolgreichen Aktionen eine kurze Bestaetigung sehen, **damit** ich weiss, dass meine Aktion ausgefuehrt wurde.

Aktuell: `sonner` ist installiert (`src/components/ui/sonner.tsx`), wird aber nirgends verwendet.

- AC-1: `<Toaster />` aus sonner in Root-Layout eingebunden (`src/app/layout.tsx`)
- AC-2: Toast nach erfolgreichem Kommentar: "Kommentar gespeichert"
- AC-3: Toast nach erfolgreicher Workflow-Aktion: "Vorgang wechselt zu: [Zielstatus]"
- AC-4: Toast nach Pause/Fortsetzen: "Verfahren pausiert" / "Verfahren fortgesetzt"
- AC-5: Toast-Dauer: 3 Sekunden, schliessbar per Klick
- AC-6: Fehler-Toasts werden NICHT eingefuehrt (Fehler bleiben inline — kein Wechsel des Error-Patterns)

### US-6: Pause-Button-Label korrigieren (UX-6)

**Als** Sachbearbeiter **moechte ich** einen klaren Aktions-Button sehen, **damit** ich weiss, was passiert wenn ich klicke.

Aktuell: Button-Label "Verfahren ruht" (Zustandsbeschreibung statt Aktionsverb) in `src/app/vorgaenge/[id]/page.tsx` Zeile 510.

- AC-1: Button-Label aendert sich von "Verfahren ruht" zu "Verfahren pausieren"
- AC-2: `aria-label` bleibt "Verfahren pausieren" (bereits korrekt)
- AC-3: Dialog-Titel bleibt "Verfahren pausieren" (bereits korrekt, Konsistenz)

## 5. Nicht-funktionale Anforderungen

- NFR-1: Keine neuen Tabellen oder Migrationen
- NFR-2: User-E-Mail-Aufloesung ausschliesslich serverseitig (auth.users nicht Client-zugaenglich)
- NFR-3: Statistik-Query darf Vorgangslisten-Response nicht verlangsamen (< 50ms Overhead)
- NFR-4: Toast-Bibliothek sonner ist bereits installiert — keine neue Dependency
- NFR-5: WCAG 2.2 Level AA fuer Focus-Indikator (Kriterium 2.4.7, 2.4.11)

## 6. Spezialisten-Trigger

- **Senior Frontend Developer:** Breadcrumbs, Toast-Integration, Focus-Styling, Label-Fix
- **Senior Backend Developer:** Kommentar-API E-Mail-Anreicherung, Statistik-Aggregation in Vorgangslisten-API

## 7. Offene Fragen

Keine — alle 6 Befunde sind klar abgegrenzt.

## 8. Annahmen

- `auth.users` ist via Service-Role-Client querybar (Supabase Standard)
- sonner `<Toaster />` kann im Root-Layout eingebunden werden ohne Seiteneffekte
- Statistik-Aggregation kann als separate Supabase-Query parallel zur Listung laufen

## 9. Abhaengigkeiten

- PROJ-3 (Vorgangsverwaltung): Vorgangsliste, Kommentare, Detail-Seite — Deployed
- PROJ-4 (Fristmanagement): Ampel-Status fuer Statistik — Deployed
- PROJ-37 (Frist-Pause): Pause-Button — Deployed
- PROJ-46 (Bestaetigungsdialog): Workflow-Aktionen — Deployed (Toast ergaenzt den Dialog)

## 10. Fachliche Risiken

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| auth.users nicht querybar via Service-Role | E-Mail-Aufloesung nicht moeglich | Fallback auf UUID-Fragment |
| Statistik-Query langsam bei vielen Vorgaengen | Vorgangsliste verlangsamt | Separate Query, ggf. Cache |

## 11. Scope / Nicht-Scope

**Scope:**
- 6 UX-Befunde aus der Kunden-Session (US-1 bis US-6)
- Backend-Erweiterung: E-Mail-Anreicherung in Kommentar-API, Statistik-Aggregation
- Frontend: Breadcrumbs, Toast, Focus, Label

**Nicht-Scope:**
- Neue Seiten oder Routes
- User-Profil-Seite oder User-Management
- Erweiterte Suchfilter in Vorgangsliste
- Tastatur-Shortcuts (PROJ-17 Massenoperationen)
