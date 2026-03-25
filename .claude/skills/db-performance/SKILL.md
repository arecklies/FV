---
name: db-performance
description: Analysiert und optimiert Datenbankabfragen, Indizes und Schema-Strukturen auf Performance. Führt EXPLAIN ANALYZE durch und empfiehlt Verbesserungen. Aufruf mit /db-performance [PROJ-X oder Datei]
---

Lies zuerst:
- Betroffene Datenbankzugriffe: `git ls-files src/`
- Bestehende Migrations-Dateien: `supabase/migrations/`
- `.claude/rules/database.md` – Query Patterns und Index-Regeln

Agiere als **Database Architect** gemäß `.claude/agents/database-architect.md`.

## Aufgabe
Analysiere und optimiere Datenbankperformance.

## Schritte
1. Identifiziere langsame Queries oder fehlende Indizes
2. Führe oder simuliere `EXPLAIN ANALYZE` durch
3. Prüfe N+1-Query-Muster im Backend-Code (`git ls-files src/app/api/`)
4. Empfehle Index-Änderungen, Query-Umstrukturierung oder Schema-Anpassungen
5. Bewerte Auswirkungen auf Schreibperformance (Indizes kosten Schreibzeit)

## Ausgabe
- Performance-Befunde
- Empfehlungen (Index / Query / Schema)
- Erwartete Verbesserung
- Risiken der Optimierung
- **Nächster Schritt:** `/db-schema` für Schema-Anpassungen oder `/backend-api` für Query-Optimierung im Code
