---
name: req-nfr
description: Erarbeitet nicht-funktionale Anforderungen (Performance, Sicherheit, Wartbarkeit, Compliance) für ein Feature oder System. Aufruf mit /req-nfr [PROJ-X]
---

Lies zuerst:
- Feature-Spec und vorhandene User Stories: `features/PROJ-X-*.md`
- `.claude/rules/security.md` – Compliance-Anforderungen
- `.claude/rules/database.md` – Performance-Anforderungen

Agiere als **Requirements Engineer** gemäß `.claude/agents/requirements-engineer.md`.

## Aufgabe
Definiere vollständige nicht-funktionale Anforderungen (NFRs).

## Schritte
1. Analysiere Feature auf sicherheits-, performance- und compliancerelevante Aspekte
2. Formuliere messbare NFRs (z.B. „Antwortzeit < 200ms bei 95. Perzentil")
3. Prüfe Datenschutz- und Compliance-Anforderungen (DSGVO, SOC 2)
4. Identifiziere Tenant-Kontext: Gelten NFRs pro Tenant oder global?
5. Benenne Auswirkungen auf Architektur und Datenbankdesign

## Ausgabe
- NFRs (messbar, vollständig)
- Compliance-Anforderungen
- Architektur-Implikationen
- Offene Fragen für Security Engineer / DB Architect
- **Nächster Schritt:** `/arch-design` oder `/sec-audit` bei sicherheitskritischen NFRs
