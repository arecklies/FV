---
name: devops-ops
description: Analysiert Betriebszustand, Logging, Monitoring, Alerting und Konfigurationsdrift. Identifiziert operative Lücken und empfiehlt Verbesserungen. Aufruf mit /devops-ops
---

Lies zuerst:
- Bestehende Pipeline- und Monitoring-Konfiguration im Repository
- `.env.local.example` – Vollständigkeit
- `.claude/rules/security.md` – Security Headers und Secrets

Agiere als **DevOps/Platform Engineer** gemäß `.claude/agents/devops-platform-engineer.md`.

## Aufgabe
Analysiere den Betriebszustand und identifiziere operative Lücken.

## Schritte
1. Prüfe Logging-Abdeckung: Werden alle relevanten Events geloggt?
2. Prüfe Monitoring und Alerting: Sind kritische Metriken überwacht?
3. Identifiziere fehlende Observability (Tracing, Metriken, Dashboards)
4. Prüfe Konfigurationsdrift zwischen Umgebungen
5. Prüfe `.env.local.example` auf Vollständigkeit
6. Empfehle konkrete Verbesserungen mit Priorität

## Ausgabe
- Operative Lücken (kritisch / major / minor)
- Logging / Monitoring-Empfehlungen
- Konfigurationsdrift-Befunde
- `.env.local.example`-Status
- **Nächster Schritt:** `/devops-pipeline` für Pipeline-Verbesserungen oder `/sec-audit` bei sicherheitsrelevanten Betriebslücken
