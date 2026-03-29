# PROJ-60: Fachliche Pruefung Glossar-Texte gegen LBOs

**Status:** Planned | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-29
**Herkunft:** Follow-up aus PROJ-54 Conditional Go (AC-1.9)
**Typ:** Fachliche Verifikation (kein Code)

---

## 1. Ziel / Problem

Die 30 Glossar-Texte in `src/lib/glossar/glossar-data.ts` wurden plausibel formuliert, aber noch nicht systematisch gegen die LBO-Quelldokumente unter `Input/` verifiziert. Vor Go-Live muss sichergestellt sein, dass alle Erklaerungen fachlich korrekt sind.

## 2. Fachlicher Kontext & Stakeholder

- **Berufseinsteiger:** Lernen Fachbegriffe ueber das Glossar -- falsche Erklaerungen fuehren zu Falschlernen
- **Fachliche Korrektheit:** Nicht verhandelbar (CLAUDE.md Qualitaetsgate)

## 3. Funktionale Anforderungen

- FA-1: Alle 30 Glossar-Eintraege gegen LBO NRW und LBO BW pruefen
- FA-2: Bundeslandspezifische Eintraege (NW, BW) auf korrekte Paragraphen-Referenzen pruefen
- FA-3: Fehlerhafte Texte korrigieren

## 4. User Stories & Akzeptanzkriterien

### US-1: Glossar-Texte fachlich verifizieren
- AC-1: Jeder der 30 Eintraege ist gegen die relevante LBO geprueft
- AC-2: Paragraphen-Referenzen in langerklaerung stimmen mit aktueller LBO ueberein
- AC-3: Keine fachlich falschen Vereinfachungen

## 11. Scope / Nicht-Scope

**Scope:** Fachliche Textpruefung und Korrektur der 30 bestehenden Eintraege
**Nicht-Scope:** Neue Eintraege hinzufuegen, UI-Aenderungen
