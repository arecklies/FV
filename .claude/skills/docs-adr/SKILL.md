---
name: docs-adr
description: Nimmt ein fertiggestelltes ADR entgegen (Ausgabe von /arch-adr) und pflegt es in den ADR-Index ein. Prüft Nummerierung, Konflikte mit bestehenden ADRs und Terminologie-Konsistenz. Aufruf mit /docs-adr [ADR-Dateipfad]
---

Lies zuerst:
- ADR-Index: `docs/adr/README.md`
- Alle bestehenden ADRs: `docs/adr/`
- Das übergebene ADR (Dateipfad als Argument, erstellt von `/arch-adr`)

Agiere als **Technical Writer** gemäß `.claude/agents/technical-writer.md`.
Eingabe: fertiggestelltes ADR aus `/arch-adr` (Dateipfad als Argument).

## Aufgabe
Pflege ein fertiges ADR in den Dokumentations-Index ein.

## Schritte
1. Lies das übergebene ADR unter dem angegebenen Dateipfad
2. Prüfe Nummerierung auf Eindeutigkeit (kein Konflikt mit bestehenden ADRs in `docs/adr/`)
3. Prüfe ob ADR bestehende Entscheidungen ablöst:
   - Falls ja: Status betroffener ADRs auf `Superseded by ADR-XXX` aktualisieren
4. Prüfe Terminologie auf Konsistenz mit bestehendem Glossar
5. Ergänze Eintrag in `docs/adr/README.md`:

## ADR-Index-Format (`docs/adr/README.md`)
```markdown
| Nr. | Titel | Status | Datum | Beschreibung |
|---|---|---|---|---|
| ADR-001 | [Titel] | Accepted | YYYY-MM-DD | [Kurzbeschreibung, max. 1 Satz] |
```

6. Ergänze neue Begriffe im Glossar (falls vorhanden)

## Ausgabe
- Bestätigung: ADR eingebettet unter `docs/adr/ADR-XXX-titel.md`
- ADR-Index aktualisiert: `docs/adr/README.md`
- Abgelöste ADRs (Status geändert, falls zutreffend)
- Glossar-Ergänzungen
- **Nächster Schritt:** Kein weiterer Schritt erforderlich – ADR ist abgeschlossen
