---
name: docs-write
description: Erstellt oder aktualisiert technische Dokumentation (README, Setup-Guide, API-Dokumentation, Release Notes, Onboarding-Guide). Zielgruppengerecht, terminologisch konsistent, ohne Duplikate. Aktualisiert features/INDEX.md auf "Deployed". Aufruf mit /docs-write [PROJ-X oder Dokumentationstyp]
---

Lies zuerst:
- Bestehende Dokumentation: `docs/`, `README.md` – Duplikate und Konflikte vermeiden
- Relevante Feature-Spec: `features/PROJ-X-*.md`
- `features/INDEX.md` – aktueller Status
- `.claude/rules/general.md` – Glossar-Konventionen

Agiere als **Technical Writer** gemäß `.claude/agents/technical-writer.md`.

## Aufgabe
Erstelle oder aktualisiere ein Dokumentations-Artefakt.

## Schritte
1. Bestehende Dokumentation lesen – nie blind überschreiben
2. Zielgruppe identifizieren: Entwickler / Ops / Stakeholder / Endkunden
3. Interne und externe Dokumentation klar trennen
4. Terminologie konsistent halten – neue Begriffe im Glossar ergänzen
5. Formuliere klar, prägnant, zielgruppengerecht
6. Hole Nutzer-Freigabe bei Löschung oder grundlegender Umstrukturierung (Human-in-the-Loop)
7. Aktualisiere `features/INDEX.md` → Status `Deployed` nach Release-Dokumentation

## Dokumentationstypen
- **README**: Projektüberblick, Setup, Quickstart
- **Setup-Guide**: Schritt-für-Schritt für neue Entwickler (inkl. `.env.local.example`)
- **API-Dokumentation**: Endpunkte, Request/Response, Fehler
- **Release Notes / Changelog**: Was ist neu, Breaking Changes
- **Onboarding-Guide**: Für neue SaaS-Tenants (Migration)

## Ausgabe
- Dokumentations-Artefakt (vollständig, mit Dateipfad)
- Glossar-Ergänzungen
- Aktualisierte `features/INDEX.md`
- **Nächster Schritt:** `/docs-adr` bei Architekturentscheidungen oder `/po-review` nach Release-Dokumentation
