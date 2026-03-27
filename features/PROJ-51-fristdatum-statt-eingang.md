# PROJ-51: Nächstes Fristdatum statt Eingangsdatum in Vorgangsliste

**Status:** Deployed | **Phase:** 1 (Kern-MVP Erweiterung) | **Erstellt:** 2026-03-27
**Herkunft:** Kunden-Demo 27.03.2026 (Eingangsdatum nicht handlungsrelevant für Tagesgeschäft)
**Priorität:** Hoch

---

## 1. Ziel / Problem

Die Vorgangsliste zeigt als letzte Spalte das Eingangsdatum. Für Sachbearbeiter im Tagesgeschäft ist das nächste Fristdatum relevanter — es zeigt wann gehandelt werden muss.

## 4. User Stories & Akzeptanzkriterien

### US-1: Fristdatum statt Eingangsdatum

- AC-1: Spalte "Eingang" wird durch "Frist bis" ersetzt
- AC-2: Zeigt das end_datum der dringendsten aktiven Frist des Vorgangs
- AC-3: Vorgänge ohne Frist zeigen "–" (kein Datum)
- AC-4: Datum im Format TT.MM.JJJJ (deutsch)

## 11. Scope / Nicht-Scope

**Scope:** Batch-Query um end_datum erweitern, Spalte in Vorgangsliste ersetzen
**Nicht-Scope:** Eingangsdatum bleibt auf Vorgangsdetail sichtbar, zusätzliche Spalte (nur Ersetzung)
