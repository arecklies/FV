# General Project Rules

## Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Zod (Validierung)
- **Datenbank**: Supabase (PostgreSQL, Row Level Security, Auth)
- **.NET-Client**: .NET Framework 4.8, WebView2, xUnit
- **Deployment**: Vercel (Next.js Hosting), Supabase Cloud (Datenbank)

## Dateistruktur Agenten & Skills
- Rollen-Prompts liegen in `.claude/agents/<rollenname>.md`
- Skills liegen in `.claude/skills/<skillname>/SKILL.md`
- Regelwerke liegen in `.claude/rules/<regelwerk>.md`
- Feature-Specs liegen in `features/PROJ-X-feature-name.md`
- Migrations-Phasen liegen in `features/MIGRATION-X-phase-name.md`
- ADRs liegen in `docs/adr/ADR-XXX-titel.md` mit Index in `docs/adr/README.md`

## Feature Tracking
- Produktvision und strategische Roadmap werden in `docs/PRD.md` geführt
- `docs/PRD.md` ist das Stammdokument für strategische Entscheidungen – vor `/pm-*` und `/po-*` Skills lesen
- Alle Features werden in `features/INDEX.md` geführt – vor jeder Arbeit lesen
- Feature-IDs sind sequenziell – nächste freie Nummer aus INDEX.md entnehmen
- Eine Spec pro Feature (Single Responsibility)
- Keine unabhängigen Funktionalitäten in einer Spec kombinieren
- Status nach Abschluss immer aktualisieren – jeder Skill, der eine Phase abschließt, schreibt den Status zurück
- Jeder neue INDEX.md-Eintrag muss eine zugehörige Spec-Datei haben – keine verwaisten Links
- Spec-Datei-Format: `features/PROJ-X-feature-name.md` (Kleinbuchstaben, Bindestriche)

## Feature-Spec-Template (Pflichtstruktur)
Jede Feature-Spec muss mindestens diese Abschnitte enthalten (Reihenfolge einhalten):
1. **Ziel / Problem** – Was wird gelöst und warum?
2. **Fachlicher Kontext & Stakeholder** – Wer ist betroffen?
3. **Funktionale Anforderungen** – Was muss das System können?
4. **User Stories & Akzeptanzkriterien** – Messbare Abnahmekriterien
5. **Nicht-funktionale Anforderungen** – Performance, Sicherheit, Barrierefreiheit
6. **Spezialisten-Trigger** – Welche Rollen müssen einbezogen werden?
7. **Offene Fragen** – Unklarheiten, die vor Implementierung zu klären sind
8. **Annahmen** – Voraussetzungen, die als gegeben betrachtet werden
9. **Abhängigkeiten** – Beziehungen zu anderen Features und Migrationen
10. **Fachliche Risiken** – Risiken mit Auswirkung und Gegenmaßnahme

Optionale Abschnitte: Scope/Nicht-Scope, Feldmapping, Prozesskette, Rechtsgrundlage.

## INDEX.md-Pflegeregeln (gilt für alle Skills)

| Skill | Aktion |
|---|---|
| `/po-backlog` | Neue Feature-ID anlegen → Status `Planned` |
| `/req-stories` | Status → `In Progress` |
| `/qs-release` | Status → `In Review` |
| `/po-review` | Status → `Deployed` (nach Go) |
| `/migration-plan` | Neue MIGRATION-ID anlegen → Status `Planned` |
| `/migration-cutover` | Status → `Deployed` nach erfolgreichem Cutover |
| `/docs-write` | Status → `Deployed` nach Release-Dokumentation |

## Git Conventions
- Commit-Format: `type(PROJ-X): description` – zwingend bei jedem Commit
- Typen: `feat`, `fix`, `refactor`, `test`, `docs`, `deploy`, `chore`, `meta`
- `meta` ist reserviert für Änderungen am Agenten-/Skill-/Rules-System selbst
- Commit-Format bei System-Optimierungen: `meta(SYS): <beschreibung>`
- `meta`-Commits erfordern immer Nutzer-Bestätigung vor dem Schreiben (Human-in-the-Loop)
- **E-Mail bei jedem Commit (Pflicht):**
  - `GIT_AUTHOR_EMAIL=arecklies@googlemail.com`
  - `GIT_COMMITTER_EMAIL=arecklies@googlemail.com`
  - **Vor dem ersten Commit einer Session pruefen:** `git config user.email` — muss `arecklies@googlemail.com` sein
  - Falls falsch: NICHT committen, sondern zuerst korrigieren
  - Vercel Hobby blockiert Deployments von unbekannten Committern — falscher Committer = Force-Push noetig
- **Kein `Co-Authored-By`** in Commit-Messages (Vercel Hobby blockiert Collaboration)
- Vor neuen Komponenten prüfen: `git ls-files src/components/`
- Vor neuen APIs prüfen: `git ls-files src/app/api/`
- Vor neuem Feature prüfen: `ls features/ | grep PROJ-`

## Deployment
- Nach `git push origin main`: `vercel --prod` ausfuehren fuer sofortiges Deployment
- Vercel Auto-Deployment kann verzoegert sein — manueller Trigger ist zuverlaessiger
- Nach Deploy: Nutzer zum Hard-Reload auffordern (Ctrl+Shift+R)

## ADR-Pflicht
- Vor jeder Implementierung prüfen, ob ein relevanter ADR existiert oder erstellt werden muss
- Bestehende ADRs aktualisieren, wenn Architekturentscheidungen konkretisiert oder geändert werden
- Kein Code-Commit für architekturrelevante Änderungen ohne aktuellen ADR
- Prüfung: `ls docs/adr/` und Abgleich mit der geplanten Änderung

## Fachliche Quelldokumente
- Rechtsgrundlagen und fachliche Eingangsdokumente liegen unter `Input/`
- Unterordner für spezifische Dokumenttypen sind erlaubt (z.B. `Input/Bauvorlagen/`)
- Verarbeitete Dokumente können mit `DONE_`-Prefix markiert werden, um den Bearbeitungsstand zu kennzeichnen
- Vor fachlich geprägten Skills (insbesondere `/pm-market`, `/req-stories`, `/arch-design`) prüfen, ob relevante Quelldokumente in `Input/` existieren
- Diese Dokumente nicht ändern – sie sind externe Referenzen (Umbenennung mit Prefix ist erlaubt)
- PDF-Extraktion: `PyPDF2` via `python -c "import sys, PyPDF2; sys.stdout.reconfigure(encoding='utf-8')"` verwenden — `pdftoppm` ist auf Windows nicht verfügbar
- PDF-Extraktion und Regelwerk-Dateien NICHT an Subagenten delegieren — Subagenten haben keinen Bash-Zugang (weder Python noch npx/npm). Regelwerk-Arbeit (PDF lesen, Dateien schreiben, Tests laufen lassen) immer im Hauptkontext durchfuehren.

## File Handling
- Datei IMMER lesen, bevor sie geändert wird – nie aus dem Gedächtnis annehmen
- Nach Context Compaction: betroffene Dateien erneut lesen
- Im Zweifel über den Projektstatus: `features/INDEX.md` zuerst lesen
- `git diff` ausführen, um bereits durchgeführte Änderungen zu prüfen
- Import-Pfade, Komponentennamen und API-Routen niemals raten – immer verifizieren

## Zeichensatz-Enforcement (Pflicht bei jedem Commit)
- Vor jedem Commit mit deutschen Texten: `grep -rn "ae\b\|oe\b\|ue\b" <geänderte-dateien>` ausführen
- Treffer gegen Kontext prüfen: nur Variable-Namen, CSS-Klassen, URLs sind Ausnahmen
- Nutzersichtbare Strings mit ASCII-Ersetzungen sind ein **blockierender Befund**
- Referenz: `.claude/rules/frontend.md` Abschnitt "Zeichensatz in Quellcode"

## Status Updates
- Gültige Statuswerte: `Planned`, `In Progress`, `In Review`, `Deployed`
- Gilt für Features (`PROJ-X`) und Migrations-Phasen (`MIGRATION-X`) gleichermaßen

## Prozess-Pflicht — STOPP-Regel (nicht verhandelbar)

**Bevor du eine Datei unter `src/` oder `supabase/` änderst, prüfe:**
1. Existiert eine PROJ-ID für diese Änderung? → `features/INDEX.md` lesen
2. Existiert eine Feature-Spec mit mindestens 1 User Story? → `features/PROJ-X-*.md` lesen
3. Wurde ein Implementierungs-Skill aufgerufen? → Nur innerhalb von `/frontend-component`, `/backend-api`, `/backend-logic`, `/frontend-integrate` Code schreiben
   - **Ausnahme Regelwerk-Daten:** Dateien unter `src/lib/regelwerk/` (verfahrensfrei.ts, bauvorlagen.ts, rechtsstand.ts, Tests) dürfen mit PROJ-ID und Feature-Spec direkt geschrieben werden — kein Implementierungs-Skill erforderlich. Zeichensatz-Prüfung (UTF-8) ist Pflicht.

Wenn eine dieser Prüfungen "Nein" ergibt: **Sofort stoppen. Keinen Code schreiben.**

**Reaktion bei direkter Nutzer-Anfrage ("Zentriere X", "Ändere den Text", "Fix Y"):**
Antworte: "Das ist eine Code-Änderung. Gemäß Prozess-Pflicht starte ich mit `/po-backlog` — soll ich das Item anlegen?"
Schreibe KEINEN Code, auch nicht "nur zum Zeigen" oder "als Vorschlag".

**Größe ist kein Kriterium.** Eine Zeile CSS, ein String-Literal, ein Import — alles durchläuft den Prozess.
Der Mindest-Workflow für offensichtliche Minor-Fixes:
`/po-backlog` (Minimal-Spec) → Implementierungs-Skill → Commit

**Quick-Fix-Kriterium:** Wenn alle drei Bedingungen erfuellt sind:
1. Aenderung betrifft max. 1 Datei unter `src/`
2. Keine neue Komponente, API-Route oder DB-Aenderung
3. Nutzer beschreibt das Problem eindeutig (z.B. "entferne X", "aendere Y zu Z")

Dann darf der Mindest-Workflow verkuerzt werden:
`/po-backlog` (Minimal-Spec: nur Ziel + 1 AC) → Implementierung direkt → Commit
Kein `/req-stories`, kein `/arch-design`, kein separater `/frontend-component`-Aufruf noetig.

**Scope-Re-Evaluation:** Wenn die Analyse (z.B. in `/req-stories` oder `/arch-design`) ergibt,
dass der tatsächliche Scope kleiner ist als angenommen:
1. Developer dokumentiert die Vereinfachung in der Feature-Spec (Scope-Abschnitt)
2. Prüft ob Quick-Fix-Kriterien jetzt erfüllt sind
3. Falls ja: Product Owner bestätigt Downgrade → verkürzter Workflow anwendbar
4. Falls nein: voller Workflow bleibt

## Bulk-Daten-Pattern (für gleichartige Datenkataloge)
- Wenn ein Feature viele strukturgleiche Dateien erfordert (z.B. 16 BL-Regelwerke):
  1. Erst 1-2 Instanzen manuell als Referenz implementieren und testen
  2. Dann ein Python-Generator-Script unter `scripts/` erstellen
  3. Generator verifiziert gegen PDF-Quelldokumente — keine manuellen Werte
  4. Generator-Scripts werden mit committet (Nachvollziehbarkeit)
  5. Generierte Dateien werden wie manuell erstellte getestet (gleiche Qualitätsgates)
  6. **Verifikation nach Generierung (Pflicht):**
     - Automatisierte Prüfung: Kein Eintrag enthält Gesetzblatt-Referenzen (BGBl, GVBl, Amtsbl) als Nutzdaten
     - Automatisierte Prüfung: Keine `bezeichnung` endet mit "..." (abgeschnitten)
     - Stichproben-Prüfung: Mindestens 3 Einträge pro generierter Datei gegen PDF-Quelldokument verifizieren
     - Paragraph-Referenzen: Absatz-Nummern (z.B. "§ 2 Abs. 3") gegen PDF prüfen — nicht aus dem Muster anderer BL interpolieren
- Bei Schema-Erweiterungen (neues Pflichtfeld auf bestehendem Interface):
  1. Interface in `types.ts` aendern (TypeScript erzwingt Vollstaendigkeit)
  2. `npx tsc --noEmit` ausfuehren — Compiler listet alle Dateien die das neue Feld benoetigen
  3. Jede Datei manuell ergaenzen (Werte aus Quelldokumenten, nicht interpolieren)
  4. Keine Generator-Scripts fuer Ergaenzungen — Generator kennt den bestehenden Kontext nicht

**Einzige Ausnahme:** Dateien außerhalb von `src/` und `supabase/` — also README, CLAUDE.md, ADRs, Feature-Specs, Rules.

## Human-in-the-Loop (gilt für alle Rollen und Skills)
> Autoritative Liste: `CLAUDE.md` Abschnitt „Human-in-the-Loop"
- Vor dem Abschluss eines Deliverables immer Nutzer-Bestätigung einholen
- Optionen als klare Auswahl präsentieren, keine offenen Fragen
- Niemals automatisch zur nächsten Phase wechseln – immer auf Bestätigung warten
- Änderungen an RLS-Policies oder Auth-Flows erfordern explizite Freigabe
- Destruktive Migrationen (DROP, Spalten entfernen) erfordern explizite Freigabe
- Neue Umgebungsvariablen → `.env.local.example` aktualisieren und Nutzer informieren
- Go / No-Go-Entscheidungen (Abnahme, Cutover) nur durch Product Owner
- Cross-Tenant-Befunde → sofortige Eskalation, kein selbstständiges Weitermachen
- Änderungen durch `/meta-optimize` an `.claude/` oder `CLAUDE.md` → jede Änderung einzeln bestätigen lassen

## Fachliche Korrektheit — Keine Halluzinationen (nicht verhandelbar)
- Alle angezeigten fachlichen Werte (Gebaeueklassen, Paragraphen, Verfahrenstypen, Rechtsgrundlagen) muessen korrekt und aus den Quelldokumenten ableitbar sein
- Werte die nicht existieren duerfen NIEMALS angezeigt werden (z.B. "Gebaeueklasse 11a" — es gibt nur GK 1-5)
- Bei Konkatenation von Werten (Zahl + Text, Paragraph + Absatz) das Ergebnis auf Plausibilitaet pruefen
- Im Zweifel: Quelldokument unter `Input/` lesen, nicht raten
- Memory-Dateien (`~/.claude/projects/*/memory/`) sind KEINE fachlichen Quellen. Sie koennen veraltet oder fehlerhaft sein. Fachliche Werte (Paragraphen, Schwellenwerte, Verordnungsnamen) IMMER gegen die PDF-Quelldokumente unter `Input/` verifizieren — auch wenn eine Memory-Referenz existiert.
- Fachlich falsche Ausgaben sind ein kritischer Befund — sofortige Korrektur, keine Toleranz

## Übergaben zwischen Rollen
- Nach Abschluss einer Rolle den nächsten Schritt vorschlagen
- Format: „Nächster Schritt: `/skillname` für [Aktion]"
- Übergaben sind immer nutzerinitiiert – keine automatischen Weiterleitungen
- Übergabe-Inhalte sind in den jeweiligen Rollen-Prompts unter `## Übergabe` definiert

## Qualitätsgates (nicht verhandelbar)
> Autoritative Liste: `CLAUDE.md` Abschnitt „Nicht verhandelbare Qualitätsgates"

Zusammenfassung der für alle Rollen relevanten Gates:
- RLS-Tests müssen grün sein vor jedem Deployment
- Testabdeckung ≥ 80 % für neue Dateien (erzwungen in CI/CD via `/devops-pipeline`)
- DB-Migration immer vor App-Deployment ausführen
- Kein Cutover ohne verifizierten Rollback-Plan und explizite Go-Entscheidung des Product Owners
- Integrations-Vollständigkeit: Neue Funktionen/Module müssen von mindestens einem Consumer importiert werden. Toter Code (implementiert aber nicht verdrahtet) ist ein Major-Befund.
