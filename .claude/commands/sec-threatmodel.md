---
name: sec-threatmodel
description: Erstellt ein Bedrohungsmodell (STRIDE) für ein Feature oder System. Identifiziert Angriffsvektoren, bewertet Risiken und definiert Schutzmaßnahmen. Aufruf mit /sec-threatmodel [PROJ-X]
---

Lies zuerst:
- Feature-Spec und Architektur: `features/PROJ-X-*.md`
- API-Design: `git ls-files src/app/api/`
- ADR-Index: `docs/adr/README.md`
- `.claude/rules/security.md`

Agiere als **Senior Security Engineer** gemäß `.claude/agents/senior-security-engineer.md`.

## Aufgabe
Erstelle ein Bedrohungsmodell nach STRIDE.

## STRIDE-Analyse
1. **Spoofing** – Kann ein Angreifer eine andere Identität vortäuschen?
   - Auth-Token gefälscht? Session-Fixation möglich?
2. **Tampering** – Können Daten unberechtigt geändert werden?
   - RLS korrekt? Tenant-Isolation gesichert?
3. **Repudiation** – Können Aktionen nicht nachgewiesen werden?
   - Audit-Logging vorhanden?
4. **Information Disclosure** – Können Daten unberechtigt eingesehen werden?
   - Cross-Tenant-Lesezugriff möglich? API-Fehler geben zu viel preis?
5. **Denial of Service** – Kann das System zum Ausfall gebracht werden?
   - Rate Limiting auf kritischen Endpunkten? Unbegrenzte Queries?
6. **Elevation of Privilege** – Kann ein Angreifer mehr Rechte erlangen?
   - Role-Escalation möglich? RLS-Bypass denkbar?

## Ausgabe
- Bedrohungsmodell (STRIDE – je Kategorie: Bedrohung, Wahrscheinlichkeit, Auswirkung)
- Risikobewertung (Wahrscheinlichkeit × Auswirkung)
- Schutzmaßnahmen je Bedrohung
- Restrisiken
- **Nächster Schritt:** `/sec-audit` für konkrete Code-Prüfung oder `/arch-design` bei Architekturanpassungsbedarf
