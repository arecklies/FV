# ADR-012: Vorgang-Datenmodell

**Status:** Accepted
**Datum:** 2026-03-26
**Autor:** Senior Software Architect
**Ausloeser:** PROJ-3 (Vorgangsverwaltung), PROJ-4 (Fristmanagement), PROJ-5 (Dokumentenverwaltung), PROJ-6 (Bescheiderzeugung), PROJ-7 (XBau)

## Kontext

Die Tabelle `vorgaenge` ist die zentrale fachliche Entitaet: 5 von 8 Phase-1-Features greifen darauf zu. Das Datenmodell muss mandantenfaehig sein (ADR-007), die Workflow Engine (ADR-011) abbilden, Fristen (PROJ-4), Dokumente (PROJ-5), Bescheide (PROJ-6) und XBau-Importe (PROJ-7) unterstuetzen.

### Anforderungen an das Modell

1. **Mandantenfaehig:** `tenant_id` mit RLS auf allen Tabellen (ADR-007)
2. **Workflow-integriert:** Aktueller Workflow-Schritt als Referenz auf ADR-011 JSON-Definitionen
3. **Erweiterbar:** Verschiedene Verfahrensarten haben unterschiedliche Felder
4. **Performant:** Vorgangsliste < 2 Sekunden bei 50 Mbit/s (PROJ-3 NFR-1)
5. **Aktenzeichen:** Konfigurierbares Schema pro Tenant (Jahrgang/Laufnummer/Kuerzel)
6. **Optimistic Locking:** Parallele Bearbeitung ohne Datenverlust (PROJ-3 FA-10)

## Entscheidung

### Kern-Tabelle: `vorgaenge`

```sql
CREATE TABLE vorgaenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- Aktenzeichen: eindeutig pro Tenant
  aktenzeichen text NOT NULL,

  -- Verfahrensart (Referenz auf Konfiguration)
  verfahrensart_id uuid NOT NULL,
  bundesland text NOT NULL,

  -- Antragsteller/Bauherr (Pflichtfelder gemaess PROJ-3 US-1)
  bauherr_name text NOT NULL,
  bauherr_anschrift text,
  bauherr_telefon text,
  bauherr_email text,

  -- Grundstueck (mindestens Adresse ODER Flurstueck Pflicht)
  grundstueck_adresse text,
  grundstueck_flurstueck text,
  grundstueck_gemarkung text,

  -- Bauvorhaben
  bezeichnung text,

  -- Workflow-Status (ADR-011: Referenz auf Schritt-ID in config_workflows JSON)
  workflow_schritt_id text NOT NULL DEFAULT 'eingegangen',

  -- Zuweisung
  zustaendiger_user_id uuid REFERENCES auth.users(id),

  -- Metadaten
  eingangsdatum timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Soft-Delete (database.md: Soft-Delete bevorzugen)
  deleted_at timestamptz,

  -- Optimistic Locking: Client sendet version bei UPDATE,
  -- Server prueft version = aktuelle version
  version int NOT NULL DEFAULT 1,

  -- Erweiterungsfelder fuer verfahrensart-spezifische Daten
  -- Vermeidet Schema-Aenderung fuer jede Verfahrensart
  extra_felder jsonb NOT NULL DEFAULT '{}',

  UNIQUE(tenant_id, aktenzeichen)
);
```

### Klassifikation

| Eigenschaft | Wert |
|---|---|
| Mandantenfaehig | Ja (`tenant_id`) |
| RLS | Ja (ADR-007 Template) |
| Soft-Delete | Ja (`deleted_at`) |
| Audit-Pflicht | Ja (alle Statusaenderungen via writeAuditLog) |

### RLS-Policies (ADR-007 Template)

```sql
ALTER TABLE vorgaenge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgaenge_tenant_select" ON vorgaenge
  FOR SELECT USING (tenant_id = get_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "vorgaenge_tenant_insert" ON vorgaenge
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgaenge_tenant_update" ON vorgaenge
  FOR UPDATE USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "vorgaenge_tenant_delete" ON vorgaenge
  FOR DELETE USING (tenant_id = get_tenant_id());
```

**Hinweis:** Die SELECT-Policy filtert `deleted_at IS NULL` standardmaessig. Fuer Admin-Ansichten (Papierkorb) wird eine separate Policy oder Service-Role-Abfrage benoetigt.

### Indizes

```sql
-- Primaer-Lookups
CREATE INDEX idx_vorgaenge_tenant ON vorgaenge(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_aktenzeichen ON vorgaenge(tenant_id, aktenzeichen);

-- Vorgangsliste: Sortierung und Filterung
CREATE INDEX idx_vorgaenge_status ON vorgaenge(tenant_id, workflow_schritt_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_zustaendig ON vorgaenge(tenant_id, zustaendiger_user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vorgaenge_eingangsdatum ON vorgaenge(tenant_id, eingangsdatum DESC)
  WHERE deleted_at IS NULL;

-- Volltextsuche (PROJ-3 FA-6)
CREATE INDEX idx_vorgaenge_search ON vorgaenge USING gin(
  to_tsvector('german', coalesce(aktenzeichen,'') || ' ' ||
    coalesce(bauherr_name,'') || ' ' ||
    coalesce(grundstueck_adresse,'') || ' ' ||
    coalesce(grundstueck_flurstueck,'') || ' ' ||
    coalesce(bezeichnung,''))
) WHERE deleted_at IS NULL;
```

### Abhaengige Tabellen

#### `vorgang_fristen` (PROJ-4)

```sql
CREATE TABLE vorgang_fristen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Fristtyp: gesamtfrist, beteiligungsfrist, nachforderungsfrist, etc.
  typ text NOT NULL,
  bezeichnung text NOT NULL,

  -- Fristberechnung
  start_datum timestamptz NOT NULL,
  end_datum timestamptz NOT NULL,
  werktage int NOT NULL,

  -- Ampellogik (berechnet durch FristService, gespeichert fuer performante Abfragen)
  status text NOT NULL DEFAULT 'gruen',  -- gruen, gelb, rot, dunkelrot, gehemmt

  -- Hemmung (PROJ-4 US-5)
  gehemmt boolean NOT NULL DEFAULT false,
  hemmung_grund text,
  hemmung_start timestamptz,
  hemmung_ende timestamptz,
  hemmung_tage int DEFAULT 0,

  -- Verlaengerung
  verlaengert boolean NOT NULL DEFAULT false,
  verlaengerung_grund text,
  original_end_datum timestamptz,

  aktiv boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Mandantenfaehig (ADR-007 Template)
-- Indizes: tenant_id, vorgang_id, (tenant_id, aktiv, end_datum) fuer Fristabfragen
```

#### `vorgang_dokumente` (PROJ-5)

```sql
CREATE TABLE vorgang_dokumente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Dokumentinfo
  dateiname text NOT NULL,
  mime_type text NOT NULL,
  groesse_bytes bigint NOT NULL,
  kategorie text NOT NULL,  -- antragsunterlagen, plaene, gutachten, bescheide, schriftverkehr
  verschlagwortung text[],   -- manuelle Tags fuer Suche

  -- Versionierung (PROJ-5 FA-5)
  version int NOT NULL DEFAULT 1,
  vorgaenger_id uuid REFERENCES vorgang_dokumente(id),
  ist_aktuelle_version boolean NOT NULL DEFAULT true,

  -- Storage-Pfad (ADR-009: {tenant_id}/{vorgang_id}/{dokument_id}/v{version}/original.ext)
  storage_pfad text NOT NULL,

  -- OCR (SHOULD HAVE im MVP)
  ocr_text text,
  ocr_status text DEFAULT 'pending',  -- pending, processing, completed, failed, skipped

  -- Posteingangsstempel (PROJ-5 FA-7)
  eingangsdatum timestamptz NOT NULL DEFAULT now(),

  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Mandantenfaehig (ADR-007 Template)
-- Indizes: tenant_id, vorgang_id, (tenant_id, kategorie), Volltext auf ocr_text
```

#### `vorgang_kommentare` (PROJ-3 FA-9)

```sql
CREATE TABLE vorgang_kommentare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,
  autor_user_id uuid NOT NULL REFERENCES auth.users(id),
  inhalt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
  -- Kein updated_at, kein deleted_at: Kommentare sind unveraenderlich (Revisionssicherheit)
);

-- RLS: Mandantenfaehig (ADR-007 Template, nur SELECT + INSERT, kein UPDATE/DELETE)
```

#### `vorgang_workflow_schritte` (ADR-011, bereits definiert)

Referenz: ADR-011, Abschnitt "Datenmodell-Erweiterung". Tabelle protokolliert jeden Workflow-Schritt-Uebergang.

#### `bescheide` (PROJ-6)

```sql
CREATE TABLE bescheide (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  bescheid_typ text NOT NULL,  -- genehmigung, ablehnung, vorbescheid, teilgenehmigung
  status text NOT NULL DEFAULT 'entwurf',  -- entwurf, freizeichnung, freigegeben, zugestellt

  -- Inhalt
  textbausteine jsonb NOT NULL DEFAULT '[]',  -- Array von {baustein_id, position, text}
  nebenbestimmungen jsonb NOT NULL DEFAULT '[]',
  platzhalter_daten jsonb NOT NULL DEFAULT '{}',  -- Befuellte Platzhalter

  -- PDF (ADR-010)
  pdf_dokument_id uuid REFERENCES vorgang_dokumente(id),
  pdf_job_id uuid,  -- Referenz auf background_jobs (ADR-008)

  -- Freizeichnung (ADR-011, Workflow-Schritt "freizeichnung")
  freigezeichnet_von uuid REFERENCES auth.users(id),
  freigezeichnet_am timestamptz,

  -- Zustellung
  zugestellt_am timestamptz,
  zustellweg text,  -- post, email, demail, egvp

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Mandantenfaehig (ADR-007 Template)
```

#### `text_bausteine` (PROJ-6, mandantenfaehig)

```sql
CREATE TABLE text_bausteine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  titel text NOT NULL,
  inhalt text NOT NULL,
  kategorie text NOT NULL,
  verfahrensart_filter text[],  -- NULL = alle Verfahrensarten
  bescheid_typ_filter text[],   -- NULL = alle Bescheidtypen
  position int NOT NULL DEFAULT 0,  -- Sortierung

  aktiv boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Mandantenfaehig (ADR-007 Template)
```

### Aktenzeichen-Generierung

```typescript
// src/lib/services/verfahren/aktenzeichen.ts

/**
 * Aktenzeichen-Schema ist pro Tenant konfigurierbar (tenants.settings.aktenzeichen_schema).
 * Default: {jahr}/{laufnummer}/{kuerzel}
 * Beispiel: 2026/0142/BG
 *
 * Race-Condition-Schutz: UNIQUE(tenant_id, aktenzeichen) + Retry bei Conflict (409).
 */
export function generateAktenzeichen(
  schema: string,
  jahr: number,
  laufnummer: number,
  verfahrenskuerzel: string
): string {
  return schema
    .replace('{jahr}', String(jahr))
    .replace('{laufnummer}', String(laufnummer).padStart(4, '0'))
    .replace('{kuerzel}', verfahrenskuerzel);
}
```

Laufnummer wird per `SELECT max(laufnummer) + 1 FROM vorgaenge WHERE tenant_id = $1 AND jahr = $2` ermittelt. UNIQUE Constraint fängt Race Conditions ab, Service wiederholt bei Conflict.

**Warum im Service, nicht als DB-Sequence:**
- Schema variiert pro Tenant (konfigurierbar)
- Verfahrenskuerzel kommt aus `config_verfahrensarten` (Applikationslogik)
- database.md: "Keine Geschaeftslogik in Datenbank-Triggern"

### Optimistic Locking

```typescript
// In VerfahrenService.update():
const { data, error } = await supabase
  .from('vorgaenge')
  .update({ ...updates, version: currentVersion + 1 })
  .eq('id', vorgangId)
  .eq('tenant_id', tenantId)
  .eq('version', currentVersion)  // Optimistic Lock
  .select()
  .single();

if (!data) {
  // Version mismatch = Concurrent Modification
  return conflictError('Vorgang wurde zwischenzeitlich geaendert.');
}
```

### `extra_felder` (JSONB) -- Erweiterbarkeit

Verschiedene Verfahrensarten benoetigen unterschiedliche Felder (z.B. "Abbruch" hat `abbruch_grund`, "Nutzungsaenderung" hat `bisherige_nutzung` / `neue_nutzung`). Statt einer Spalte pro moeglichem Feld wird `extra_felder jsonb` verwendet.

**Validierung:** Zod-Schema pro Verfahrensart in `src/lib/services/verfahren/schemas/`. Die API-Route validiert `extra_felder` gegen das verfahrensart-spezifische Schema.

**Warum kein EAV-Modell (Entity-Attribute-Value):**
- EAV ist schwer abzufragen und zu indizieren
- JSONB mit GIN-Index ist performanter und einfacher
- Zod-Validierung pro Verfahrensart bietet Typsicherheit

## Alternativen verworfen

### 1. Separate Tabelle pro Verfahrensart

- **Pro:** Maximale Typsicherheit, klare Spalten
- **Contra:** 10+ Tabellen mit >80% identischen Spalten. JOIN-Komplexitaet bei uebergreifenden Queries (Vorgangsliste). Migration bei Schema-Aenderung auf allen Tabellen.
- **Fazit:** Nicht wartbar bei 11 Verfahrensarten. Eine Tabelle mit `extra_felder` JSONB ist pragmatischer.

### 2. Alles in `extra_felder` JSONB (schemaless)

- **Pro:** Maximale Flexibilitaet, kein Schema-Management
- **Contra:** Keine DB-Level-Constraints, keine FK-Referenzen, schlechte Abfrage-Performance auf Kernfeldern. Bauherr und Grundstueck sind in JEDEM Vorgang Pflicht.
- **Fazit:** Kernfelder als Spalten, verfahrensart-spezifische Felder als JSONB. Hybrid-Ansatz.

### 3. Aktenzeichen als DB-Sequence

- **Pro:** Race-Condition-frei by design
- **Contra:** Sequence ist global, nicht pro Tenant+Jahr konfigurierbar. Schema-Variation (z.B. "{kuerzel}-{jahr}/{nr}") nicht abbildbar. Luecken bei Rollback.
- **Fazit:** Applikationsseitige Generierung mit UNIQUE Constraint + Retry ist flexibler und deckt die Konfigurierbarkeitsanforderung ab.

## Konsequenzen

### Positiv
- **Eine Tabelle** fuer alle Verfahrensarten -- einfache Queries, einfache Vorgangsliste
- **JSONB** fuer verfahrensart-spezifische Erweiterungen ohne Schema-Migration
- **Optimistic Locking** via `version`-Spalte ermoeglicht parallele Bearbeitung
- **Volltextsuche** ueber GIN-Index auf PostgreSQL (kein externer Service)
- **Aktenzeichen** konfigurierbar pro Tenant (Schema in `tenants.settings`)
- **Alle Unter-Tabellen** folgen dem gleichen RLS-Pattern (ADR-007)
- **Soft-Delete** auf `vorgaenge` (Audit-Pflicht, kein harter DELETE)
- **Keine Geschaeftslogik in Triggern** (nur `updated_at`, gemaess database.md)

### Negativ / Risiken
- `extra_felder` JSONB erfordert Zod-Validierung pro Verfahrensart -- Fehler in Schema-Definitionen fuehren zu inkonsistenten Daten
- Volltextsuche ist PostgreSQL-spezifisch -- bei Migration zu anderem DB-System Nacharbeit
- Aktenzeichen-Generierung hat Retry-Overhead bei hoher Parallelitaet (akzeptabel: max 50 gleichzeitige SB)
- 6+ Unter-Tabellen erhoehen JOIN-Komplexitaet in Detailansichten

### Migrations-Reihenfolge
```
1. vorgaenge (Kern)
2. vorgang_fristen (PROJ-4)
3. vorgang_dokumente (PROJ-5)
4. vorgang_kommentare (PROJ-3)
5. vorgang_workflow_schritte (ADR-011, bereits definiert)
6. bescheide + text_bausteine (PROJ-6)
```

Jede Migration ist eigenstaendig und rueckwaertskompatibel (Zero-Downtime).

## Beteiligte Rollen

| Rolle | Verantwortung |
|---|---|
| Senior Software Architect | Datenmodell-Design, Trade-off-Analyse |
| Database Architect | Schema-Implementierung, RLS-Policies, Indizes, EXPLAIN ANALYZE |
| Senior Backend Developer | VerfahrenService, Aktenzeichen-Generierung, Optimistic Locking |
| Senior Security Engineer | RLS-Review, Cross-Tenant-Pruefung |
| QS Engineer | RLS-Integrationstests fuer alle Tabellen |

## Referenzen

- PROJ-3: Vorgangsverwaltung (Kern-Feature)
- PROJ-4: Fristmanagement (`vorgang_fristen`)
- PROJ-5: Dokumentenverwaltung (`vorgang_dokumente`)
- PROJ-6: Bescheiderzeugung (`bescheide`, `text_bausteine`)
- PROJ-7: XBau-Import (legt Vorgang an)
- ADR-003: Service-Architektur (VerfahrenService)
- ADR-006: Rechtskonfiguration (`config_verfahrensarten`, `extra_felder`-Schemas)
- ADR-007: Multi-Tenancy (RLS-Template, `get_tenant_id()`)
- ADR-011: Workflow Engine (`workflow_schritt_id`, `vorgang_workflow_schritte`)
