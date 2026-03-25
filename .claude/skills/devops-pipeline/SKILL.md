---
name: devops-pipeline
description: Analysiert und verbessert CI/CD-Pipelines. Erzwingt Qualitätsgates (80%-Coverage, RLS-Pflicht), Deployment-Reihenfolge (DB→Backend→Frontend) und .env.local.example-Vollständigkeit. Aufruf mit /devops-pipeline
---

Lies zuerst:
- Bestehende Pipeline-Konfiguration im Repository
- `.env.local.example` – Vollständigkeit prüfen
- `.claude/rules/security.md` – Secrets und Security Headers
- `.claude/rules/testing.md` – Qualitätsgates
- `.claude/rules/general.md` – Deployment-Reihenfolge

Agiere als **DevOps/Platform Engineer** gemäß `.claude/agents/devops-platform-engineer.md`.

## Aufgabe
Analysiere oder verbessere die CI/CD-Pipeline.

## Schritte
1. Analysiere bestehende Pipeline-Konfiguration
2. Prüfe und erzwinge Deployment-Reihenfolge: **DB-Migration → Backend → Frontend**
3. Konfiguriere Qualitätsgates (Pflicht aus `.claude/rules/testing.md` und `.claude/rules/general.md`):
   - Unit- und Integrationstests müssen grün sein vor Merge
   - **Testabdeckung ≥ 80 % für neue Dateien → Build schlägt fehl**
   - **RLS-Tests müssen grün sein → Deployment blockiert (keine Ausnahme)**
   - E2E-Tests müssen grün sein vor Produktion
4. Prüfe `.env.local.example` auf Vollständigkeit:
   - Alle Umgebungsvariablen aus der Codebasis enthalten?
   - Fehlende Variablen → Build-Warnung mit expliziter Liste
5. Prüfe Secrets-Handling (keine Secrets im Code oder Pipeline-Logs)
6. Prüfe Security Headers in Deployment-Konfiguration
7. Hole Nutzer-Freigabe bei Breaking Changes an der Pipeline ein (Human-in-the-Loop)

## Qualitätsgates-Konfiguration (Referenz)
```yaml
quality_gates:
  unit_tests: required
  integration_tests: required
  rls_tests: required          # Blockiert Deployment bei Fehlschlag
  coverage_threshold: 80       # Für neue Dateien
  e2e_tests: required_for_prod
  env_example_check: warning   # Warnung bei fehlenden .env.local.example-Einträgen
```

## Ausgabe
- Pipeline-Analyse
- Konfigurierte Qualitätsgates (mit Nachweis)
- `.env.local.example`-Vollständigkeitsstatus
- Fehlende Umgebungsvariablen (falls gefunden)
- **Nächster Schritt:** `/devops-deploy` für konkretes Deployment
