# ADR-017: Loeschstrategie und PII-Inventar

**Status:** Accepted
**Datum:** 2026-03-29
**Autor:** Senior Software Architect
**Feature:** PROJ-41 (Loeschkonzept und Aufbewahrungsfristen)

## Kontext

DSGVO Art. 17 (Recht auf Loeschung) und Art. 5(1)(e) (Speicherbegrenzung) verlangen, dass personenbezogene Daten nach Ablauf der Aufbewahrungsfrist vollstaendig geloescht werden koennen. Leipzigs Datenschutzbeauftragter verlangt ein dokumentiertes Loeschkonzept vor Vertragsschluss.

Das System speichert personenbezogene Daten (PII) in mehreren Schichten:

1. **Relationale Daten**: Vorgaenge, Beteiligte, Kommentare, Fristen, Workflow-Schritte
2. **Audit-Log**: Strukturierte Protokolleintraege mit PII im `payload`-Feld (ADR-005)
3. **XBau-Nachrichten**: Roh-XML mit eingebetteten PII (`roh_xml`-Feld)
4. **Dokumente**: Dateien in Supabase Storage (ADR-009)
5. **Backups**: Supabase Point-in-Time Recovery (PITR)

Soft-Delete (`deleted_at`) genuegt nicht fuer DSGVO-Konformitaet -- die Daten bleiben physisch in der Datenbank. Hard-Delete ist die einzige Strategie, die Art. 17 vollstaendig erfuellt.

### Herausforderungen

- Referenzielle Integritaet: Abhaengige Zeilen muessen mitgeloescht werden
- Audit-Trail: Strukturdaten (wer hat wann was getan) muessen fuer Revisionssicherheit erhalten bleiben, PII im Payload nicht
- Statistik: Anonymisierte Vorgangsdaten sollen fuer Reporting verfuegbar bleiben
- Vier-Augen-Prinzip: Loeschung darf nicht durch eine einzelne Person ausgeloest werden
- Massenloeschung: Bei Fristablauf koennen hunderte Vorgaenge gleichzeitig loeschfaehig sein
- Backups: PITR-Snapshots enthalten geloeschte Daten fuer die Retention-Dauer

## Entscheidung

**Hard-Delete als Primaerstrategie mit selektiver Anonymisierung fuer Audit-Log und XBau-Statistikdaten. Vier-Augen-Freigabe ueber dedizierte Tabelle. Massenloeschung ueber background_jobs (ADR-008). PII-Inventar als zentraler Service.**

### 1. Loeschstrategie je Datentyp

| Datentyp | Strategie | Begruendung |
|---|---|---|
| `vorgaenge` (Stammdaten) | Hard-Delete (Zeile entfernen) | Art. 17 DSGVO -- vollstaendige Loeschung |
| `kommentare` | CASCADE-Delete (FK auf vorgang_id) | Abhaengige Daten, keine eigenstaendige Aufbewahrungspflicht |
| `fristen` | CASCADE-Delete (FK auf vorgang_id) | Abhaengige Daten |
| `workflow_schritte` | CASCADE-Delete (FK auf vorgang_id) | Abhaengige Daten |
| `vorgang_beteiligte` | CASCADE-Delete (FK auf vorgang_id) | PII-Kernbestand (Namen, Adressen) |
| `audit_log` | Anonymisierung (`payload` auf `{}` setzen) | Struktur bleibt fuer Revisionssicherheit (ADR-005), PII wird entfernt |
| `xbau_nachrichten` | `roh_xml` auf NULL setzen, Zeile bleibt | Nachrichtentyp und Zeitstempel bleiben fuer Statistik |
| Dokumente (Storage) | Hard-Delete aus Supabase Storage | Physische Dateiloeschung ueber Storage API |
| Backups (PITR) | Organisatorisch: PITR Retention max. 7 Tage | Nach 7 Tagen sind geloeschte Daten auch aus Backups entfernt |

### 2. Neue Tabellen

#### config_aufbewahrungsfristen

Konfigurierbare Aufbewahrungsfristen je Vorgangstyp und Mandant.

```sql
CREATE TABLE config_aufbewahrungsfristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgangstyp text NOT NULL,           -- z.B. 'baugenehmigung', 'bauvoranfrage'
  frist_jahre int NOT NULL DEFAULT 10, -- Aufbewahrungsfrist in Jahren
  rechtsgrundlage text,                -- z.B. 'SaechsArchivG Par. 5'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, vorgangstyp)
);

-- RLS: Mandantenfaehig, nur eigener Tenant
ALTER TABLE config_aufbewahrungsfristen ENABLE ROW LEVEL SECURITY;
```

#### vorgang_loeschungen

Loeschprotokoll -- dokumentiert was wann von wem geloescht wurde. Enthaelt KEINE PII, nur Referenz-IDs und Vorgangstyp.

```sql
CREATE TABLE vorgang_loeschungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL,              -- Referenz (Vorgang ist nach Loeschung weg)
  vorgangstyp text NOT NULL,
  aktenzeichen_hash text NOT NULL,       -- SHA-256 des Aktenzeichens (Zuordnung ohne PII)
  geloescht_von uuid NOT NULL REFERENCES auth.users(id),
  freigegeben_von uuid NOT NULL REFERENCES auth.users(id),
  geloescht_am timestamptz DEFAULT now(),
  dokumente_anzahl int NOT NULL DEFAULT 0,
  audit_eintraege_anonymisiert int NOT NULL DEFAULT 0,
  xbau_nachrichten_bereinigt int NOT NULL DEFAULT 0,
  storage_bytes_freigegeben bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS: Mandantenfaehig, nur eigener Tenant
ALTER TABLE vorgang_loeschungen ENABLE ROW LEVEL SECURITY;
```

#### loeschung_freigaben

Vier-Augen-Prinzip: Loeschantrag und Freigabe durch zwei verschiedene Personen.

```sql
CREATE TABLE loeschung_freigaben (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL,  -- Kein FK auf vorgaenge: Vorgang wird geloescht, Freigabe-Zeile bleibt als Protokoll
  beantragt_von uuid NOT NULL REFERENCES auth.users(id),
  beantragt_am timestamptz DEFAULT now(),
  freigegeben_von uuid REFERENCES auth.users(id),
  freigegeben_am timestamptz,
  status text NOT NULL DEFAULT 'ausstehend', -- 'ausstehend', 'freigegeben', 'abgelehnt'
  ablehnungsgrund text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT verschiedene_personen CHECK (beantragt_von != freigegeben_von)
);

-- RLS: Mandantenfaehig, nur eigener Tenant
ALTER TABLE loeschung_freigaben ENABLE ROW LEVEL SECURITY;
```

### 3. Neues Feld auf vorgaenge

```sql
ALTER TABLE vorgaenge ADD COLUMN abgeschlossen_am timestamptz;
```

Denormalisiertes Feld fuer performante Fristberechnung. Wird gesetzt, wenn der Vorgang in einen Endstatus wechselt. Ermoeglicht einfachen Query:

```sql
SELECT * FROM vorgaenge
WHERE abgeschlossen_am IS NOT NULL
AND abgeschlossen_am + (frist_jahre || ' years')::interval < now();
```

### 4. Loeschablauf (Sequenz)

```
1. Admin beantragt Loeschung
   -> INSERT INTO loeschung_freigaben (status='ausstehend')
   -> Benachrichtigung an zweiten Admin

2. Zweiter Admin gibt frei
   -> UPDATE loeschung_freigaben SET status='freigegeben'
   -> CONSTRAINT prueft: beantragt_von != freigegeben_von

3. Loeschung wird als background_job eingereiht (ADR-008)
   -> INSERT INTO background_jobs (type='vorgang_loeschung')

4. Worker fuehrt Loeschung durch (innerhalb einer Transaktion):
   a) Dokumente aus Supabase Storage loeschen (Storage API)
   b) audit_log anonymisieren: payload auf '{}', ip_address auf NULL setzen WHERE resource_id = vorgang_id
   c) xbau_nachrichten.roh_xml auf NULL setzen WHERE vorgang_id = vorgang_id
   d) DELETE FROM vorgaenge WHERE id = vorgang_id (CASCADE loescht abhaengige Zeilen)
   e) INSERT INTO vorgang_loeschungen (Protokoll)

5. Job-Status auf 'completed' setzen
```

### 5. Massenloeschung

- Massenloeschung ueber background_jobs mit Batch-Groesse 50
- Ein Job pro Batch (nicht pro Vorgang) -- reduziert Overhead
- Fortschritt wird im `output`-Feld des Jobs als JSON gespeichert: `{ "total": 200, "processed": 50, "failed": 0 }`
- Bei Fehler in einem Vorgang: Vorgang ueberspringen, im Protokoll vermerken, naechsten verarbeiten
- Kein Abbruch des gesamten Batches bei Einzelfehler

### 6. PII-Inventar (PiiInventoryService)

Zentraler Service, der alle Felder mit personenbezogenen Daten kennt. Dient als Single Source of Truth fuer:

- Loeschoperationen (welche Felder/Tabellen muessen beruecksichtigt werden)
- DSGVO-Auskunftsanfragen (Art. 15)
- Datenschutz-Folgenabschaetzung (Art. 35)
- Audit durch Datenschutzbeauftragten

```typescript
// src/lib/services/pii/pii-inventory.ts

interface PiiField {
  tabelle: string;
  feld: string;
  piiKategorie: 'name' | 'adresse' | 'kontakt' | 'identifikation' | 'dokument' | 'freitext';
  loeschstrategie: 'cascade_delete' | 'hard_delete' | 'anonymisieren' | 'nullsetzen' | 'storage_delete';
  rechtsgrundlage: string;
}

const PII_INVENTORY: PiiField[] = [
  // siehe Anhang A
];
```

### 7. Backup-Handling

- Supabase PITR Retention wird auf maximal 7 Tage konfiguriert
- Nach Loeschung dauert es maximal 7 Tage, bis die Daten auch aus Backups entfernt sind
- Dieses Restrisiko wird im Loeschkonzept-Dokument fuer den DSB dokumentiert
- Fuer hoeheren Schutzbedarf (Phase 3): Evaluierung von verschluesseltem Backup mit Tenant-spezifischen Schluesseln (Key-Loeschung = Datenloeschung)

## Begruendung

1. **Hard-Delete statt Anonymisierung**: Art. 17 DSGVO fordert Loeschung, nicht Anonymisierung. Anonymisierung ist aufwaendiger (jedes Feld einzeln), fehleranfaelliger (neue Felder vergessen) und erzeugt Schein-Sicherheit bei unvollstaendiger Umsetzung.

2. **CASCADE-Delete fuer abhaengige Zeilen**: PostgreSQL-native Loesung, atomar, keine verwaisten Zeilen. Einfacher und zuverlaessiger als applikationsseitige Loeschlogik ueber mehrere Tabellen.

3. **Audit-Log Anonymisierung statt Loeschung**: ADR-005 fordert Revisionssicherheit. Die Struktur (wer hat wann welche Aktion ausgefuehrt) muss erhalten bleiben. Nur der PII-haltige Payload wird entfernt.

4. **XBau-Nachrichten: roh_xml NULL statt Zeilenloeschung**: Nachrichtentyp, Zeitstempel und Status bleiben fuer Statistik und Nachvollziehbarkeit der Kommunikation erhalten. Nur das PII-haltige XML wird entfernt.

5. **Vier-Augen-Prinzip**: Schutz vor versehentlicher oder boesartiger Loeschung. CONSTRAINT auf DB-Ebene verhindert Selbst-Freigabe.

6. **PII-Inventar als Service**: Zentrale Pflege statt verteilter Kommentare. Aenderungen an einem Ort, Nutzung in Loeschung, Auskunft und Audit.

7. **PITR Retention 7 Tage**: Pragmatischer Kompromiss zwischen Disaster-Recovery-Faehigkeit und DSGVO-Konformitaet. Kuerzere Retention erhoeht das Risiko bei DB-Ausfaellen.

## Konsequenzen

### Positiv

- Vollstaendige DSGVO-Konformitaet fuer Art. 17 (Loeschung) und Art. 5(1)(e) (Speicherbegrenzung)
- Dokumentiertes Loeschkonzept fuer Vertragsgspraeche mit DSB
- PII-Inventar als lebendes Dokument, das bei Schema-Aenderungen aktualisiert wird
- Vier-Augen-Prinzip auf DB-Ebene (nicht nur applikationsseitig)
- Massenloeschung ohne Performance-Einbruch durch Batch-Verarbeitung

### Negativ

- Hard-Delete ist unumkehrbar -- versehentlich geloeschte Daten sind unwiederbringlich (Mitigation: Vier-Augen + Archiv-Export vor Loeschung)
- CASCADE-Delete erfordert sorgfaeltige FK-Definition -- fehlende FK fuehren zu verwaisten Zeilen
- PITR-Restrisiko: Geloeschte Daten sind bis zu 7 Tage in Backups vorhanden
- PII-Inventar muss bei jeder Schema-Aenderung manuell aktualisiert werden (kein automatisches Discovery)
- Audit-Log-Anonymisierung ist nicht rueckgaengig machbar -- bei falschem Vorgang sind die Details verloren

### Neutral

- `abgeschlossen_am` ist eine kontrollierte Denormalisierung fuer Performance -- muss bei Statuswechsel konsistent gesetzt werden
- Loeschprotokoll (`vorgang_loeschungen`) waechst dauerhaft, hat aber keine PII und minimalen Speicherbedarf
- Storage-Loeschung ist ein separater API-Call (nicht innerhalb der DB-Transaktion) -- bei Fehler kann die Datei verwaisen. Gegenmassnahme: Ein `storage_orphan_cleanup`-Background-Job (ADR-008) laeuft taeglich und prueft: Fuer jeden Storage-Pfad unter `tenants/{tenant_id}/vorgaenge/{vorgang_id}/` wird geprueft ob der Vorgang noch existiert. Existiert er nicht, wird die Datei geloescht. Der Job loggt die Anzahl bereinigter Dateien.

## Alternativen verworfen

### 1. Anonymisierung statt Hard-Delete

- **Pro:** Daten bleiben fuer Statistik nutzbar, kein Datenverlust
- **Contra:** Aufwaendiger (jedes PII-Feld einzeln), fehleranfaellig bei neuen Feldern, rechtlich umstritten ob Anonymisierung = Loeschung
- **Fazit:** Fuer Audit-Log und XBau-Nachrichten angemessen, fuer Kerndaten (Vorgaenge, Beteiligte) nicht ausreichend fuer Art. 17

### 2. Soft-Delete mit Purge-Cron

- **Pro:** Daten sind zunaechst wiederherstellbar (Undo-Fenster)
- **Contra:** PII bleibt in der Datenbank bis zum Purge. Purge-Zeitpunkt muss definiert werden. Komplexer als direkter Hard-Delete. `deleted_at`-Filter muessen in ALLEN Queries konsistent sein.
- **Fazit:** Undo-Fenster wird durch Vier-Augen-Prinzip und Archiv-Export vor Loeschung ersetzt

### 3. Verschluesselung mit Key-Rotation (Crypto-Shredding)

- **Pro:** Daten werden durch Key-Loeschung unlesbar, ohne physische Loeschung
- **Contra:** Erfordert Encryption-at-Rest auf Feldebene, erheblicher Implementierungsaufwand, Performance-Impact bei jeder Lese-/Schreiboperation. Supabase bietet keine native Feld-Verschluesselung.
- **Fazit:** Fuer Phase 3 als Backup-Strategie evaluieren, nicht als Primaerstrategie

### 4. Automatische Loeschung nach Fristablauf

- **Pro:** Kein manueller Aufwand
- **Contra:** Anbietungspflicht an Landesarchiv muss VOR Loeschung erfuellt werden (Landesarchivgesetze). Automatische Loeschung wuerde diese Pflicht unterlaufen. Risiko versehentlicher Loeschung ohne menschliche Kontrolle.
- **Fazit:** Explizit aus Scope ausgeschlossen (PROJ-41 Nicht-Scope)

## Referenzen

- [ADR-005](ADR-005-audit-trail-revisionssicherheit.md): Audit-Trail und Revisionssicherheit (Stufe 1: Append-Only, Stufe 2: Hash-Verkettung)
- [ADR-007](ADR-007-multi-tenancy-modell.md): Multi-Tenancy-Modell (tenant_id auf allen mandantenfaehigen Tabellen)
- [ADR-008](ADR-008-asynchrone-verarbeitung-background-jobs.md): Asynchrone Verarbeitung und Background Jobs (Massenloeschung als background_job)
- [ADR-009](ADR-009-dokumenten-storage-upload.md): Dokumenten-Storage und Upload-Strategie (Storage-Loeschung ueber Storage API)
- [PROJ-41](../../features/PROJ-41-loeschkonzept-dsgvo.md): Loeschkonzept und Aufbewahrungsfristen (Feature-Spec)
- DSGVO Art. 5(1)(e), Art. 15, Art. 17
- Landesarchivgesetze (Anbietungspflicht vor Loeschung)

---

## Anhang A: PII-Inventar

| Tabelle | Feld | PII-Kategorie | Loeschstrategie | Beispiel |
|---|---|---|---|---|
| `vorgaenge` | `bauherr_name` | name | cascade_delete | "Max Mustermann" |
| `vorgaenge` | `bauherr_anschrift` | adresse | cascade_delete | "Musterstr. 1, 04103 Leipzig" |
| `vorgaenge` | `bauherr_telefon` | kontakt | cascade_delete | "+49 341 1234567" |
| `vorgaenge` | `bauherr_email` | kontakt | cascade_delete | "mustermann@example.com" |
| `vorgaenge` | `aktenzeichen` | identifikation | cascade_delete | "BV-2026-00123" |
| `vorgaenge` | `grundstueck_adresse` | adresse | cascade_delete | "Baustr. 10, 04109 Leipzig" |
| `vorgaenge` | `bezeichnung` | freitext | cascade_delete | "Neubau EFH Mustermann" |
| `vorgang_beteiligte` | `name` | name | cascade_delete | "Dipl.-Ing. Planer" |
| `vorgang_beteiligte` | `anschrift` | adresse | cascade_delete | "Planerweg 3" |
| `vorgang_beteiligte` | `email` | kontakt | cascade_delete | "planer@example.com" |
| `vorgang_beteiligte` | `telefon` | kontakt | cascade_delete | "+49 341 1234567" |
| `vorgang_beteiligte` | `rolle` | identifikation | cascade_delete | "entwurfsverfasser" |
| `kommentare` | `inhalt` | freitext | cascade_delete | Freitext mit moeglichen PII |
| `kommentare` | `erstellt_von_name` | name | cascade_delete | Anzeigename des Verfassers |
| `fristen` | `hinweis` | freitext | cascade_delete | Freitext mit moeglichen PII |
| `dokumente` | `dateiname` | identifikation | cascade_delete | "Bauantrag_Mustermann.pdf" |
| `dokumente` | `storage_pfad` | dokument | storage_delete | "tenant_id/vorgang_id/doc_id/v1/original.pdf" |
| `audit_log` | `payload` | freitext | anonymisieren | JSONB mit Aenderungsdetails |
| `audit_log` | `ip_address` | kontakt | anonymisieren | "192.168.1.1" |
| `xbau_nachrichten` | `roh_xml` | freitext | nullsetzen | Vollstaendiges XBau-XML mit eingebetteten PII |
| `erhebungsboegen` | `eigentuemer_*` | name/adresse | cascade_delete | Eigentuemer-Daten |
| `erhebungsboegen` | `bauherr_*` | name/adresse | cascade_delete | Bauherr-Daten |
| `loeschung_freigaben` | `beantragt_von` | identifikation | hard_delete | User-ID (FK auf auth.users) |
| `loeschung_freigaben` | `freigegeben_von` | identifikation | hard_delete | User-ID (FK auf auth.users) |

**Hinweise zum PII-Inventar:**

- Das Inventar muss bei jeder Schema-Aenderung aktualisiert werden (Pflicht in `/db-schema`)
- Felder mit `cascade_delete` werden durch `ON DELETE CASCADE` auf dem FK automatisch mitgeloescht
- Felder mit `anonymisieren` erfordern explizites UPDATE vor dem DELETE des Vorgangs
- Felder mit `nullsetzen` erfordern explizites UPDATE vor dem DELETE des Vorgangs
- Felder mit `storage_delete` erfordern einen separaten Storage-API-Aufruf
- Felder mit `hard_delete` werden nach der Loeschfreigabe entfernt (die loeschung_freigaben-Zeile selbst referenziert den geloeschten Vorgang nur noch ueber vorgang_loeschungen)

## Anhang B: RLS-Policies (Uebersicht)

| Tabelle | SELECT | INSERT | UPDATE | DELETE | Klassifikation |
|---|---|---|---|---|---|
| `config_aufbewahrungsfristen` | tenant_id | tenant_id | tenant_id | tenant_id | mandantenfaehig |
| `vorgang_loeschungen` | tenant_id | deny-all (Service-Only) | deny-all | deny-all | mandantenfaehig (nur Lesen) |
| `loeschung_freigaben` | tenant_id | tenant_id | tenant_id | deny-all | mandantenfaehig |

- `vorgang_loeschungen` ist INSERT-Service-Only: Nur der Loeschworker (Service-Role) schreibt Eintraege
- `loeschung_freigaben` erlaubt kein Client-DELETE: Freigaben sind unveraenderlich nach Erstellung (UPDATE nur fuer Freigabe/Ablehnung)
