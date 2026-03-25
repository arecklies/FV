---
name: po-backlog
description: Formt Roadmap-Vorgaben oder neue Ideen in priorisierte Backlog-Items um. Empfängt auch Security-Eskalationen und priorisiert diese als Notfall-Items. Schreibt neue Feature-IDs in features/INDEX.md. Aufruf mit /po-backlog
---

Lies zuerst:
- `features/INDEX.md` – aktueller Backlog-Stand und nächste freie Feature-ID
- `.claude/rules/general.md` – INDEX.md-Pflegeregeln und Human-in-the-Loop

Agiere als **Product Owner** gemäß `.claude/agents/product-owner.md`.

## Aufgabe
Übersetze Roadmap-Vorgaben, neue Ideen oder Security-Eskalationen in priorisierte Backlog-Items.

## Security-Eskalation erkennen
Wenn Eingabe ein Security-Eskalations-Bericht ist:
1. Feature-ID als `SEC-HOTFIX-X` vergeben (höchste Priorität)
2. Scope: nur die kritische Schwachstelle beheben
3. Spezialisten-Trigger: Senior Security Engineer + Senior Backend Developer
4. Status sofort auf `In Progress` setzen
5. Nutzer-Bestätigung einholen (Human-in-the-Loop)

## Quick-Fix-Prüfung (vor regulärem Ablauf)
Prüfe ob alle drei Quick-Fix-Kriterien aus `.claude/rules/general.md` erfüllt sind:
1. Änderung betrifft max. 1 Datei unter `src/`
2. Keine neue Komponente, API-Route oder DB-Änderung
3. Nutzer beschreibt das Problem eindeutig (z.B. "entferne X", "ändere Y zu Z")

**Wenn ja:** Minimal-Spec erstellen (nur Ziel + 1 AC), in INDEX.md eintragen → direkt Implementierung.
Kein `/req-stories`, kein `/arch-design` nötig.
**Wenn nein:** Reguläres Backlog-Item (siehe unten).

## Reguläres Backlog-Item
1. Prüfe bestehende Features auf Ähnlichkeit
2. Konsistenzcheck: Prüfe ob das neue Feature bestehenden Specs widerspricht:
   - Lies die Specs aller Features mit Status `Deployed` oder `In Progress`
   - Prüfe insbesondere Datenschutz-Aussagen, Architektur-Entscheidungen (ADRs) und Produktvision (PRD.md)
   - Bei Widerspruch: Nutzer informieren und Auflösung vorschlagen, bevor Feature-Spec erstellt wird
3. Forme jede Idee in ein Backlog-Item: Nutzen / Scope / Priorisierung
4. Führe Spezialisten-Check durch:
   - Sensible Daten? → Senior Security Engineer
   - Hohe Datenlast / komplexe Relationen? → Database Architect
   - Legacy-Ablösung / Tenant-Onboarding? → Migration Architect
   - Komplex oder für Externe? → Technical Writer
5. Vergib Feature-ID (nächste freie aus `features/INDEX.md`)
6. Hole Nutzer-Bestätigung vor Anlage (Human-in-the-Loop)
7. Erstelle Spec-Datei `features/PROJ-X-feature-name.md` mit mindestens:
   - Ziel / Problem
   - Fachlicher Kontext & Stakeholder
   - Scope und Nicht-Scope (Entwurf – wird von `/req-stories` verfeinert)
   - Abhängigkeiten (aus INDEX.md und bestehenden Specs ablesen)
8. Schreibe neues Item in `features/INDEX.md` → Status `Planned` mit Link auf Spec-Datei

## INDEX.md-Eintrag-Format
```markdown
| PROJ-X | [Feature-Titel] | Planned | [PROJ-X](PROJ-X-feature-name.md) | YYYY-MM-DD |
```

## Ausgabe
- Priorisierte Backlog-Items (Nutzen / Scope / Priorität)
- Spezialisten-Bedarf je Item
- Aktualisierte `features/INDEX.md`
- **Nächster Schritt:** `/req-stories` für reguläre Items oder `/sec-review` für Security-Hotfix
