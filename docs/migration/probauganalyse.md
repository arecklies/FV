# ProBauG-Datenanalyse (MIGRATION-1)

**Erstellt:** 2026-03-27 | **Status:** Entwurf
**Quellen:** Branchenwissen ProBauG/Nolis, Kundenfeedback 26./27.03.2026, Ziel-Schema PROJ-2/3/4

---

## 1. ProBauG-Ueberblick

ProBauG (Nolis GmbH, ehemals MESO) ist ein .NET-Framework-Fachverfahren auf MS SQL Server. Typische Datenmengen pro Kommune: 5.000-20.000 Vorgaenge, 50.000-100.000 Dokumente, 10-15 Jahre Datenhistorie.

## 2. Feld-Mapping ProBauG → Ziel-Schema

### Vorgaenge (Kern)

| ProBauG | Ziel | Transformation | Risiko |
|---|---|---|---|
| Vorgang.Aktenzeichen | vorgaenge.aktenzeichen | 1:1, Trim | Niedrig |
| Vorgang.Verfahrensart (int) | vorgaenge.verfahrensart_id (uuid) | Lookup-Mapping noetig | Mittel |
| Vorgang.Status (int) | vorgaenge.workflow_schritt_id (text) | **Status-Mapping je Kunde** | **Hoch** |
| Vorgang.Eingangsdatum | vorgaenge.eingangsdatum | datetime → timestamptz (Berlin) | Niedrig |
| Beteiligter (Rolle=Bauherr) | vorgaenge.bauherr_name/anschrift/telefon/email | Filter + Konkatenation | Niedrig |
| Grundstueck.* | vorgaenge.grundstueck_* | 1:1 | Niedrig |
| — | vorgaenge.tenant_id | Aus Tenant-Zuordnung | Niedrig |

### Fristen

| ProBauG | Ziel | Transformation | Risiko |
|---|---|---|---|
| Frist.Fristtyp (int) | vorgang_fristen.typ (text) | Typ-Mapping | Mittel |
| Frist.Start/Enddatum | vorgang_fristen.start/end_datum | datetime → timestamptz | Niedrig |
| — (berechnet) | vorgang_fristen.werktage | Neuberechnung aus Start/End | Mittel |
| — (berechnet) | vorgang_fristen.status | Ampel-Neuberechnung | Mittel |

### Nicht migrierbar (Feature fehlt)

| Datenbereich | Blockiert durch | Prioritaet |
|---|---|---|
| Beteiligte (ToEB) | PROJ-12 | P2 |
| Dokument-Dateien | PROJ-5 | P2 |
| Gebuehren | PROJ-14 | P3 |
| Textbausteine | PROJ-6 | P3 |

## 3. Datenvolumen

| Behoerdengroesse | Vorgaenge | DB-Groesse | Dateien | Migrationsdauer |
|---|---|---|---|---|
| Klein (3-5 SB) | ~800 | ~5 MB | ~20 GB | 3-9 Std |
| Mittel (10-20 SB) | ~4.000 | ~25 MB | ~80 GB | 10-29 Std |
| Gross (30+ SB) | ~15.000 | ~100 MB | ~200 GB | 1-4 Tage |

## 4. Risiken

| # | Risiko | Schwere | Gegenmassnahme |
|---|---|---|---|
| R-1 | **Status-Mapping**: ProBauG-Status-IDs sind installationsabhaengig | Kritisch | Individuelles Mapping pro Kunde, Stichproben-Validierung |
| R-2 | **Benutzer-Mapping**: Windows-AD → Supabase Auth | Hoch | Mapping-Tabelle, Fallback-User fuer Historie |
| R-3 | **Datenqualitaet**: 12+ Jahre, Duplikate, verwaiste Referenzen | Hoch | Qualitaetsbericht vor Migration, Quarantaene-Tabelle |
| R-4 | **Dokument-Dateien**: UNC-Pfade gebrochen, Volumen 20-200 GB | Hoch | Existenzpruefung, Batch-Upload, erst nach PROJ-5 |
| R-5 | **Timezone**: datetime ohne TZ → timestamptz | Mittel | Annahme Europe/Berlin, Stichproben-Check |

## 5. Migrationsstrategie: Stichtagsmodell

**Begruendung:** ProBauG hat kein CDC, DB-Volumen < 200 MB erlaubt Einmalimport, Kunden wollen keinen Parallelbetrieb.

```
Phase A: Vorbereitung (2-4 Wochen)
  → DB-Export, Qualitaetsbericht, Status/Benutzer-Mapping, Probemigration

Phase B: Stichtag (1 Arbeitstag)
  → 17:00 ProBauG Read-Only → Export → Import → Validierung → Go/No-Go

Phase C: Nachlauf (1 Woche)
  → Benutzer-Zuweisungen, offene Vorgaenge pruefen, Dokument-Upload
```

**Rollback:** Vor Go/No-Go: 30 Min. Bis 5 Werktage: 1-2 Tage. Danach: kein einfacher Rollback.

## 6. Offene Fragen (Sofort zu klaeren)

| # | Frage | Mit wem |
|---|---|---|
| 1 | Welche ProBauG-Version + MS SQL Version? | Kunde IT |
| 2 | Custom-Status oder Custom-Felder? | Kunde Fachbereich |
| 3 | Welche Vorgaenge migrieren? (Alle oder nur aktive?) | Kunde + PO |
| 4 | Wer ist Pilotkommune? | PM + PO |
| 5 | AVV unterschrieben? (Pflicht vor Datenzugriff) | PM + Recht |

## 7. Voraussetzungen fuer Pilotmigration

- PROJ-2 (Mandanten-Schema) deployed ← **noch Planned**
- PROJ-3 + PROJ-4 deployed ← erledigt
- PROJ-33 (Vier-Augen-Lite) deployed ← Pilotblocker
- Pilotkommune identifiziert + AVV unterzeichnet
