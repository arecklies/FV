-- PROJ-48: Verlängerung der Baugenehmigung — Geltungsdauer und Verlängerungshistorie
-- Migration: 20260327200000_proj48_geltungsdauer_verlaengerung.sql
--
-- Aenderungen:
--   1. vorgaenge: ADD COLUMN geltungsdauer_bis (timestamptz, nullable)
--   2. config_fristen: ADD COLUMN kalendertage (integer, nullable), werktage DROP NOT NULL
--   3. vorgang_verlaengerungen (neu, Service-Only) — Verlängerungshistorie
--   4. config_fristen: INSERT Geltungsdauer-Einträge (NRW + BW)
--
-- Voraussetzungen:
--   20260326120000_proj3_vorgangsverwaltung.sql (vorgaenge, config_verfahrensarten)
--   20260326140000_proj4_fristmanagement.sql (config_fristen)
--   20260328100000_proj44_lbo_bw_konfiguration.sql (BW-Verfahrensarten)
--
-- Rechtsgrundlage:
--   NRW: § 75 Abs. 1 BauO NRW — Genehmigung erlischt nach 3 Jahren
--   BW:  § 62 LBO BW — Genehmigung erlischt nach 3 Jahren
--
-- Zero-Downtime: Ja (alle ADD COLUMN nullable, kein Table-Rewrite)
-- ============================================================================


-- ============================================================================
-- 1. ALTER TABLE vorgaenge: Geltungsdauer-Feld
-- ============================================================================

ALTER TABLE vorgaenge ADD COLUMN geltungsdauer_bis timestamptz;

COMMENT ON COLUMN vorgaenge.geltungsdauer_bis IS 'PROJ-48: Ablaufdatum der Baugenehmigung. Automatisch gesetzt bei Bescheidzustellung (Workflow-Schritt "zustellung"). NULL bei Kenntnisgabe und noch nicht zugestellten Vorgaengen.';

-- Partial Index: Nur Vorgaenge mit gesetzter Geltungsdauer (fuer spaetere Ablauf-Queries)
CREATE INDEX idx_vorgaenge_geltungsdauer ON vorgaenge(tenant_id, geltungsdauer_bis)
  WHERE geltungsdauer_bis IS NOT NULL;


-- ============================================================================
-- 2. ALTER TABLE config_fristen: Kalendertage-Feld + Constraint-Anpassung
-- Geltungsdauer wird in Kalendertagen gerechnet (§ 75 BauO NRW: "3 Jahre"),
-- bestehende Fristen in Werktagen. Genau eines von beiden muss gesetzt sein.
-- ============================================================================

-- 2a. Neue Spalte
ALTER TABLE config_fristen ADD COLUMN kalendertage integer;

COMMENT ON COLUMN config_fristen.kalendertage IS 'PROJ-48: Fristdauer in Kalendertagen (fuer Geltungsdauer). Mutually exclusive mit werktage: genau eines muss gesetzt sein.';

-- 2b. Bestehenden NOT NULL + CHECK auf werktage entfernen
-- (werktage war: NOT NULL CHECK (werktage > 0))
ALTER TABLE config_fristen ALTER COLUMN werktage DROP NOT NULL;
ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_werktage_check;

-- 2c. Neuer CHECK: Genau eines von werktage/kalendertage muss gesetzt und positiv sein
ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_dauer_check
  CHECK (
    (werktage IS NOT NULL AND werktage > 0 AND kalendertage IS NULL)
    OR
    (kalendertage IS NOT NULL AND kalendertage > 0 AND werktage IS NULL)
  );


-- ============================================================================
-- 3. Neue Tabelle: vorgang_verlaengerungen (Service-Only)
-- Verlängerungshistorie je Vorgang (PROJ-48 US-3, US-4, US-5)
-- ============================================================================

CREATE TABLE vorgang_verlaengerungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  vorgang_id uuid NOT NULL REFERENCES vorgaenge(id) ON DELETE CASCADE,

  -- Verlängerungsdaten
  altes_datum timestamptz NOT NULL,
  neues_datum timestamptz NOT NULL,
  antragsdatum date NOT NULL,
  begruendung text NOT NULL,
  verlaengerung_tage integer NOT NULL CHECK (verlaengerung_tage > 0),

  -- Wer hat die Verlängerung erfasst?
  sachbearbeiter_id uuid NOT NULL REFERENCES auth.users(id),

  -- Metadaten
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE vorgang_verlaengerungen IS 'Service-Only: Verlängerungshistorie fuer Baugenehmigungen (PROJ-48). Zugriff nur ueber Service-Role.';
COMMENT ON COLUMN vorgang_verlaengerungen.altes_datum IS 'Geltungsdauer_bis VOR der Verlaengerung.';
COMMENT ON COLUMN vorgang_verlaengerungen.neues_datum IS 'Geltungsdauer_bis NACH der Verlaengerung.';
COMMENT ON COLUMN vorgang_verlaengerungen.antragsdatum IS 'Datum des schriftlichen Verlaengerungsantrags des Bauherrn.';
COMMENT ON COLUMN vorgang_verlaengerungen.verlaengerung_tage IS 'Verlaengerung in Kalendertagen (Standard: 365).';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE vorgang_verlaengerungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vorgang_verlaengerungen_deny_select" ON vorgang_verlaengerungen
  FOR SELECT USING (false);
CREATE POLICY "vorgang_verlaengerungen_deny_insert" ON vorgang_verlaengerungen
  FOR INSERT WITH CHECK (false);
CREATE POLICY "vorgang_verlaengerungen_deny_update" ON vorgang_verlaengerungen
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "vorgang_verlaengerungen_deny_delete" ON vorgang_verlaengerungen
  FOR DELETE USING (false);

-- Index: Verlängerungen eines Vorgangs (Detail-Ansicht, chronologisch)
CREATE INDEX idx_vorgang_verlaengerungen_vorgang ON vorgang_verlaengerungen(vorgang_id, created_at DESC);

-- Index: Tenant-Lookup (Admin-Queries)
CREATE INDEX idx_vorgang_verlaengerungen_tenant ON vorgang_verlaengerungen(tenant_id);


-- ============================================================================
-- 4. Config-Daten: Geltungsdauer je Bundesland und Verfahrensart
-- Typ 'geltungsdauer' mit kalendertage (nicht werktage)
-- ============================================================================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, kalendertage, rechtsgrundlage) VALUES
  -- NRW: § 75 Abs. 1 BauO NRW — 3 Jahre
  ('NW', 'b0000000-0000-4000-8000-000000000001', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Freistellung',    1095, '§ 63 Abs. 4 BauO NRW'),
  -- BW: § 62 LBO BW — 3 Jahre
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'geltungsdauer', 'Geltungsdauer Baugenehmigung',  1095, '§ 62 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'geltungsdauer', 'Geltungsdauer Bauvorbescheid',  1095, '§ 62 LBO BW');
  -- Kein Eintrag fuer BW Kenntnisgabe (b1000000-...-000000000001): keine Geltungsdauer


-- ============================================================================
-- Rollback (als Referenz, ausfuehren via supabase/rollbacks/):
--
-- DELETE FROM config_fristen WHERE typ = 'geltungsdauer';
-- DROP TABLE IF EXISTS vorgang_verlaengerungen CASCADE;
-- ALTER TABLE config_fristen DROP CONSTRAINT IF EXISTS config_fristen_dauer_check;
-- ALTER TABLE config_fristen DROP COLUMN IF EXISTS kalendertage;
-- ALTER TABLE config_fristen ALTER COLUMN werktage SET NOT NULL;
-- ALTER TABLE config_fristen ADD CONSTRAINT config_fristen_werktage_check CHECK (werktage > 0);
-- DROP INDEX IF EXISTS idx_vorgaenge_geltungsdauer;
-- ALTER TABLE vorgaenge DROP COLUMN IF EXISTS geltungsdauer_bis;
-- ============================================================================
-- PROJ-44: LBO Baden-Wuerttemberg Regelwerk-Konfiguration
-- Rein additive Migration (INSERT only) — kein Einfluss auf bestehende NRW-Daten
-- Rollback: supabase/rollbacks/20260328100000_proj44_lbo_bw_konfiguration_rollback.sql
--
-- Rechtsgrundlage: LBO BW in der Fassung vom 5. Maerz 2010,
-- letzte Aenderung vom 18.03.2025 (gueltig ab 28.06.2025)
-- Quelle: Input/Gesetzte/LBOs/Baden-Wuerttemberg.pdf

-- ==============================
-- 1. Verfahrensarten BW (4 Stueck)
-- ==============================
-- Reihenfolge Insert: Verfahrensarten ZUERST (FK-Abhaengigkeit von Workflows und Fristen)

INSERT INTO config_verfahrensarten (id, bundesland, kuerzel, bezeichnung, kategorie, sortierung, rechtsgrundlage) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'BW', 'KG',   'Kenntnisgabeverfahren',                    'kenntnisgabe', 1, '§ 51 LBO BW'),
  ('b1000000-0000-4000-8000-000000000002', 'BW', 'BG-V', 'Baugenehmigung (vereinfacht)',              'genehmigung',  2, '§ 52 LBO BW'),
  ('b1000000-0000-4000-8000-000000000003', 'BW', 'BG',   'Baugenehmigung (regulär)',                  'genehmigung',  3, '§§ 49, 58 LBO BW'),
  ('b1000000-0000-4000-8000-000000000004', 'BW', 'VB',   'Bauvorbescheid',                            'vorbescheid',  4, '§ 57 LBO BW');

-- ==============================
-- 2. Workflow: Kenntnisgabeverfahren (BW)
-- ==============================
-- Besonderheit: Kein Genehmigungsbescheid, kein Vier-Augen-Prinzip.
-- Baubeginn nach 2 Wochen Wartefrist (§ 59 Abs. 4 LBO BW).
-- Eingangsbestaetigung innerhalb 5 AT (§ 53 Abs. 5 LBO BW).

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'BW', 1, '{
    "name": "Kenntnisgabeverfahren (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {
        "id": "eingegangen",
        "label": "Unterlagen eingegangen",
        "typ": "automatisch",
        "naechsteSchritte": ["vollstaendigkeitspruefung"],
        "aktionen": []
      },
      {
        "id": "vollstaendigkeitspruefung",
        "label": "Vollständigkeitsprüfung",
        "typ": "manuell",
        "naechsteSchritte": ["nachforderung", "baubeginn_wartefrist"],
        "aktionen": [
          {"id": "vollstaendig", "label": "Vollständig — Eingang bestätigen", "ziel": "baubeginn_wartefrist"},
          {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}
        ],
        "frist": "eingangsbestaetigung",
        "hinweis": "Eingangsbestätigung innerhalb von 5 Arbeitstagen (§ 53 Abs. 5 LBO BW). Prüfen Sie ob alle Bauvorlagen vollständig sind.",
        "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis", "Nachweis B-Plan-Konformität"]
      },
      {
        "id": "nachforderung",
        "label": "Nachforderung",
        "typ": "manuell",
        "naechsteSchritte": ["vollstaendigkeitspruefung"],
        "aktionen": [
          {"id": "eingegangen", "label": "Unterlagen nachgereicht", "ziel": "vollstaendigkeitspruefung"}
        ],
        "hinweis": "Bauherr wurde über fehlende Unterlagen informiert (§ 53 Abs. 6 LBO BW)."
      },
      {
        "id": "baubeginn_wartefrist",
        "label": "Baubeginn-Wartefrist",
        "typ": "manuell",
        "naechsteSchritte": ["bauausfuehrung"],
        "aktionen": [
          {"id": "frist_abgelaufen", "label": "Wartefrist abgelaufen — Baubeginn möglich", "ziel": "bauausfuehrung"}
        ],
        "frist": "baubeginn_wartefrist",
        "hinweis": "Baubeginn frühestens 2 Wochen nach Eingangsbestätigung (§ 59 Abs. 4 LBO BW). Bauherrn über Baubeginn-Berechtigung informieren."
      },
      {
        "id": "bauausfuehrung",
        "label": "Bauausführung",
        "typ": "manuell",
        "naechsteSchritte": ["abgeschlossen"],
        "aktionen": [
          {"id": "fertiggestellt", "label": "Bauvorhaben fertiggestellt", "ziel": "abgeschlossen"}
        ]
      },
      {
        "id": "abgeschlossen",
        "label": "Vorgang abgeschlossen",
        "typ": "endstatus",
        "naechsteSchritte": [],
        "aktionen": []
      }
    ]
  }'::jsonb);

-- ==============================
-- 3. Workflow: Baugenehmigung vereinfacht (BW)
-- ==============================
-- Pruefumfang eingeschraenkt (§ 52 Abs. 2 LBO BW).
-- Entscheidungsfrist 1 Monat (§ 54 Abs. 5 LBO BW).
-- Genehmigungsfiktion moeglich (§ 58 Abs. 1a LBO BW).

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000002', 'BW', 1, '{
    "name": "Baugenehmigung vereinfacht (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "beteiligung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "beteiligung"}, {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Vollständigkeit innerhalb von 10 Arbeitstagen prüfen (§ 54 Abs. 1 LBO BW).", "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis"]},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}], "hinweis": "Fristabläufe sind gehemmt bis Nachbesserung eingeht (§ 54 Abs. 1 Satz 3 LBO BW)."},
      {"id": "beteiligung", "label": "ToEB-Beteiligung", "typ": "manuell", "naechsteSchritte": ["pruefung"], "aktionen": [{"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}], "frist": "beteiligungsfrist", "hinweis": "Stellungnahmefrist max. 1 Monat (§ 54 Abs. 3 LBO BW)."},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist", "hinweis": "Entscheidungsfrist 1 Monat (§ 54 Abs. 5 LBO BW). Achtung: Bei Fristablauf greift Genehmigungsfiktion (§ 58 Abs. 1a LBO BW)."},
      {"id": "bescheid_entwurf", "label": "Bescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Bescheid erstellt — Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Bescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}], "hinweis": "Zustellung an Bauherr und beteiligte Angrenzer (§ 58 Abs. 1 LBO BW)."},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 4. Workflow: Baugenehmigung regulaer (BW)
-- ==============================
-- Voller Pruefumfang (§ 58 Abs. 1 LBO BW).
-- Entscheidungsfrist 2 Monate (§ 54 Abs. 5 LBO BW).
-- Keine Genehmigungsfiktion.

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000003', 'BW', 1, '{
    "name": "Baugenehmigung regulär (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "beteiligung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "beteiligung"}, {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Vollständigkeit innerhalb von 10 Arbeitstagen prüfen (§ 54 Abs. 1 LBO BW).", "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis", "Brandschutznachweis"]},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}], "hinweis": "Fristabläufe sind gehemmt bis Nachbesserung eingeht (§ 54 Abs. 1 Satz 3 LBO BW)."},
      {"id": "beteiligung", "label": "ToEB-Beteiligung", "typ": "manuell", "naechsteSchritte": ["pruefung"], "aktionen": [{"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}], "frist": "beteiligungsfrist", "hinweis": "Stellungnahmefrist max. 1 Monat (§ 54 Abs. 3 LBO BW)."},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist", "hinweis": "Entscheidungsfrist 2 Monate (§ 54 Abs. 5 LBO BW). Keine Genehmigungsfiktion im regulären Verfahren."},
      {"id": "bescheid_entwurf", "label": "Bescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Bescheid erstellt — Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Bescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}], "hinweis": "Zustellung an Bauherr, Angrenzer mit Einwendungen und berührte Nachbarn (§ 58 Abs. 1 LBO BW)."},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 5. Workflow: Bauvorbescheid (BW)
-- ==============================
-- Vorab-Klaerung einzelner Fragen (§ 57 LBO BW).
-- Vereinfachter Workflow ohne Beteiligung (nur auf Antrag).
-- Entscheidungsfrist 1 Monat (§ 54 Abs. 5 LBO BW).

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b1000000-0000-4000-8000-000000000004', 'BW', 1, '{
    "name": "Bauvorbescheid (BW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "pruefung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "pruefung"}, {"id": "unvollstaendig", "label": "Unvollständig — Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Vollständigkeit innerhalb von 10 Arbeitstagen prüfen (§ 54 Abs. 1 LBO BW)."},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}]},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "entschieden", "label": "Vorbescheid erstellen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist", "hinweis": "Entscheidungsfrist 1 Monat (§ 54 Abs. 5 i.V.m. § 57 Abs. 2 LBO BW)."},
      {"id": "bescheid_entwurf", "label": "Vorbescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Vorbescheid erstellt — Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Vorbescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Vorbescheid zugestellt", "ziel": "abgeschlossen"}]},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 6. Fristen: Kenntnisgabeverfahren (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000001', 'eingangsbestaetigung',    'Eingangsbestätigung Kenntnisgabe',   5,  '§ 53 Abs. 5 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000001', 'baubeginn_wartefrist',    'Baubeginn-Wartefrist',              10,  '§ 59 Abs. 4 LBO BW');

-- ==============================
-- 7. Fristen: Baugenehmigung vereinfacht (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung',          10,  '§ 54 Abs. 1 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'beteiligungsfrist',         'Beteiligungsfrist ToEB',           20,  '§ 54 Abs. 3 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000002', 'gesamtfrist',              'Entscheidungsfrist (vereinfacht)',   20,  '§ 54 Abs. 5 LBO BW');

-- ==============================
-- 8. Fristen: Baugenehmigung regulaer (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung',          10,  '§ 54 Abs. 1 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'beteiligungsfrist',         'Beteiligungsfrist ToEB',           20,  '§ 54 Abs. 3 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000003', 'gesamtfrist',              'Entscheidungsfrist (regulär)',       40,  '§ 54 Abs. 5 LBO BW');

-- ==============================
-- 9. Fristen: Bauvorbescheid (BW)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung',          10,  '§ 54 Abs. 1 LBO BW'),
  ('BW', 'b1000000-0000-4000-8000-000000000004', 'gesamtfrist',              'Entscheidungsfrist Vorbescheid',    20,  '§ 54 Abs. 5 i.V.m. § 57 Abs. 2 LBO BW');

-- ==============================
-- 10. Feiertage BW 2026
-- ==============================
-- Nur BW-spezifische Feiertage (bundesweite liegen bereits mit bundesland=NULL vor)

INSERT INTO config_feiertage (bundesland, datum, bezeichnung, jahr) VALUES
  ('BW', '2026-01-06', 'Heilige Drei Könige',   2026),
  ('BW', '2026-06-04', 'Fronleichnam',           2026),
  ('BW', '2026-11-01', 'Allerheiligen',          2026);

-- ==============================
-- 11. Feiertage BW 2027
-- ==============================

INSERT INTO config_feiertage (bundesland, datum, bezeichnung, jahr) VALUES
  ('BW', '2027-01-06', 'Heilige Drei Könige',   2027),
  ('BW', '2027-05-27', 'Fronleichnam',           2027),
  ('BW', '2027-11-01', 'Allerheiligen',          2027);
-- ============================================================================
-- PROJ-7: XBau-Basisschnittstelle — Nachrichten-Schema
-- Migration: 20260328200000_proj7_xbau_nachrichten.sql
-- ADR-015 (XBau-Nachrichten-Datenmodell), ADR-004 (XBau-Integrationsstrategie)
-- ADR-007 (Multi-Tenancy, Service-Only-Pattern)
--
-- Tabellen:
--   1. xbau_nachrichten (Service-Only, mandantenfaehig) — Ein-/Ausgehende XBau-Nachrichten
--   2. config_xbau_codelisten (Service-Only) — Mapping XBau-Codes <-> DB-Codes
--
-- Aenderungen an bestehenden Tabellen:
--   3. config_verfahrensarten: ADD COLUMN xbau_code (ADR-015 Entscheidung 5)
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql
--   (tenants, tenant_members, audit_log, get_tenant_id(), update_updated_at())
-- Voraussetzung: 20260326120000_proj3_vorgangsverwaltung.sql
--   (vorgaenge, config_verfahrensarten)
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: xbau_nachrichten (Service-Only, mandantenfaehig)
-- ADR-015: Zentrale Nachrichtentabelle fuer alle ein-/ausgehenden XBau-Nachrichten
-- Zugriff nur ueber Service-Role im Backend (deny-all RLS)
-- ============================================================================

CREATE TABLE xbau_nachrichten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- XBau-Nachrichten-Identifikation
  nachrichten_uuid uuid NOT NULL,          -- nachrichtenkopf.nachrichtenUUID aus XML
  nachrichtentyp text NOT NULL,            -- z.B. '0200', '0201', '1100', '1180', '0420'
  richtung text NOT NULL                   -- 'eingang' oder 'ausgang'
    CHECK (richtung IN ('eingang', 'ausgang')),

  -- Verarbeitungsstatus (ADR-015 Status-Lifecycle)
  -- Eingang: empfangen → verarbeitet | abgewiesen
  -- Ausgang: generiert → heruntergeladen
  status text NOT NULL DEFAULT 'empfangen'
    CHECK (status IN ('empfangen', 'verarbeitet', 'abgewiesen', 'generiert', 'heruntergeladen')),

  -- Vorgangszuordnung (nullable: Nachricht kann noch nicht zugeordnet sein)
  vorgang_id uuid REFERENCES vorgaenge(id),

  -- Korrelationsfelder (ADR-015 Zuordnungsalgorithmus, dreistufig)
  referenz_uuid uuid,                     -- bezug.referenz (Portal-UUID)
  bezug_nachrichten_uuid uuid,            -- bezug.bezugNachricht.nachrichtenUUID
  bezug_aktenzeichen text,                -- bezug.vorgang (Aktenzeichen der Gegenbehoerde)

  -- Absender/Empfaenger aus Nachrichtenkopf
  absender_behoerde text,                 -- nachrichtenkopf.autor.verzeichnisdienst
  empfaenger_behoerde text,               -- nachrichtenkopf.leser.verzeichnisdienst

  -- Dualstruktur (ADR-015): roh_xml + kerndaten
  roh_xml text NOT NULL,                  -- Vollstaendiges Roh-XML (PII-sensitiv, NIE an Frontend)
  kerndaten jsonb NOT NULL DEFAULT '{}',  -- Extrahierte Daten fuer UI (kein PII)

  -- Fehlerdetails bei Abweisung (Fehlerkennzahl X/V/S/A-Serie, Fehlertext)
  fehler_details jsonb,                   -- z.B. {"kennzahl": "X001", "text": "..."}

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Duplikat-Schutz: Dieselbe Nachricht darf pro Tenant nur einmal existieren (US-1a AC-8)
  UNIQUE(tenant_id, nachrichten_uuid)
);

COMMENT ON TABLE xbau_nachrichten IS 'Service-Only: Ein-/ausgehende XBau-Nachrichten (ADR-015). Zugriff nur ueber Service-Role. Roh-XML ist PII-sensitiv.';
COMMENT ON COLUMN xbau_nachrichten.nachrichten_uuid IS 'XBau nachrichtenkopf.nachrichtenUUID — eindeutig pro Nachricht.';
COMMENT ON COLUMN xbau_nachrichten.nachrichtentyp IS 'XBau-Nachrichtentyp: 0200 (Antrag), 0201 (Formelle Pruefung), 0420-0427 (Statistik), 1100 (Rueckweisung), 1180 (Quittung).';
COMMENT ON COLUMN xbau_nachrichten.richtung IS 'eingang = empfangene Nachricht, ausgang = generierte Nachricht.';
COMMENT ON COLUMN xbau_nachrichten.status IS 'Lifecycle: empfangen→verarbeitet|abgewiesen (Eingang), generiert→heruntergeladen (Ausgang).';
COMMENT ON COLUMN xbau_nachrichten.roh_xml IS 'PII-sensitiv: Vollstaendiges XML. Nur Backend-Zugriff, nie an Frontend ausliefern (NFR-8).';
COMMENT ON COLUMN xbau_nachrichten.kerndaten IS 'Extrahierte Kerndaten fuer UI-Anzeige (Transportprotokoll). Kein PII.';
COMMENT ON COLUMN xbau_nachrichten.referenz_uuid IS 'bezug.referenz — Portal-UUID fuer Folgenachrichten-Zuordnung (Stufe 2).';
COMMENT ON COLUMN xbau_nachrichten.bezug_nachrichten_uuid IS 'bezug.bezugNachricht.nachrichtenUUID — Zuordnung Stufe 3.';
COMMENT ON COLUMN xbau_nachrichten.bezug_aktenzeichen IS 'bezug.vorgang — Aktenzeichen fuer Zuordnung Stufe 1.';

-- RLS: Service-Only (deny-all fuer Client-Rollen, ADR-007)
ALTER TABLE xbau_nachrichten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xbau_nachrichten_deny_select" ON xbau_nachrichten
  FOR SELECT USING (false);
CREATE POLICY "xbau_nachrichten_deny_insert" ON xbau_nachrichten
  FOR INSERT WITH CHECK (false);
CREATE POLICY "xbau_nachrichten_deny_update" ON xbau_nachrichten
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "xbau_nachrichten_deny_delete" ON xbau_nachrichten
  FOR DELETE USING (false);

-- Indizes (ADR-015 Zuordnungsalgorithmus + Transportprotokoll)

-- Transportprotokoll: Nachrichten eines Vorgangs chronologisch laden
CREATE INDEX idx_xbau_nachrichten_vorgang ON xbau_nachrichten(tenant_id, vorgang_id, created_at DESC)
  WHERE vorgang_id IS NOT NULL;

-- Duplikat-Lookup (UNIQUE-Constraint deckt dies ab, aber expliziter Index fuer Lesbarkeit)
-- UNIQUE(tenant_id, nachrichten_uuid) erzeugt bereits einen Index — kein zusaetzlicher noetig

-- Zuordnungsalgorithmus Stufe 2: bezug.referenz → referenz_uuid
CREATE INDEX idx_xbau_nachrichten_referenz ON xbau_nachrichten(tenant_id, referenz_uuid)
  WHERE referenz_uuid IS NOT NULL;

-- Fehler-Queue / Status-Filterung
CREATE INDEX idx_xbau_nachrichten_status ON xbau_nachrichten(tenant_id, status);

-- updated_at-Trigger
CREATE TRIGGER trg_xbau_nachrichten_updated_at
  BEFORE UPDATE ON xbau_nachrichten
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 2. Tabelle: config_xbau_codelisten (Service-Only)
-- ADR-004: Codelisten-Mapping DB-Codes <-> XBau-Codes
-- Referenz: xbau-codes.xsd (listURI, listVersionID als fixed-Attribute)
-- ============================================================================

CREATE TABLE config_xbau_codelisten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codeliste text NOT NULL,                -- z.B. 'Code.RaeumeAnzahl', 'Code.Energietraeger'
  xbau_code text NOT NULL,                -- Code-Wert im XBau-XML
  db_code text,                           -- Zugehoeriger Code in der DB (nullable: nicht jeder XBau-Code hat DB-Pendant)
  bezeichnung text NOT NULL,              -- Menschenlesbare Bezeichnung
  list_uri text NOT NULL,                 -- listURI aus xbau-codes.xsd (fixed-Attribut)
  list_version_id text NOT NULL,          -- listVersionID aus xbau-codes.xsd (fixed-Attribut)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(codeliste, xbau_code)
);

COMMENT ON TABLE config_xbau_codelisten IS 'Service-Only: Mapping XBau-Codes <-> DB-Codes (ADR-004). listURI und listVersionID exakt aus xbau-codes.xsd.';
COMMENT ON COLUMN config_xbau_codelisten.codeliste IS 'XBau-Codelistenname (z.B. Code.RaeumeAnzahl). Entspricht Typ in xbau-codes.xsd.';
COMMENT ON COLUMN config_xbau_codelisten.xbau_code IS 'Code-Wert wie im XBau-XML verwendet.';
COMMENT ON COLUMN config_xbau_codelisten.db_code IS 'Zugehoeriger DB-Code (z.B. code_energietraeger.code). NULL wenn kein DB-Pendant.';
COMMENT ON COLUMN config_xbau_codelisten.list_uri IS 'Exakt aus xbau-codes.xsd: listURI fixed-Attribut. Pflicht in jedem generierten XML.';
COMMENT ON COLUMN config_xbau_codelisten.list_version_id IS 'Exakt aus xbau-codes.xsd: listVersionID fixed-Attribut. Pflicht in jedem generierten XML.';

-- RLS: Service-Only (deny-all fuer Client-Rollen)
ALTER TABLE config_xbau_codelisten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_xbau_codelisten_deny_select" ON config_xbau_codelisten
  FOR SELECT USING (false);
CREATE POLICY "config_xbau_codelisten_deny_insert" ON config_xbau_codelisten
  FOR INSERT WITH CHECK (false);
CREATE POLICY "config_xbau_codelisten_deny_update" ON config_xbau_codelisten
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "config_xbau_codelisten_deny_delete" ON config_xbau_codelisten
  FOR DELETE USING (false);

-- Index: UNIQUE(codeliste, xbau_code) erzeugt bereits den primaeren Lookup-Index
-- Zusaetzlicher Index fuer Reverse-Lookup (DB-Code → XBau-Code bei Export)
CREATE INDEX idx_config_xbau_codelisten_db_code ON config_xbau_codelisten(codeliste, db_code)
  WHERE db_code IS NOT NULL;

-- updated_at-Trigger
CREATE TRIGGER trg_config_xbau_codelisten_updated_at
  BEFORE UPDATE ON config_xbau_codelisten
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 3. ALTER TABLE: config_verfahrensarten — xbau_code Spalte
-- ADR-015 Entscheidung 5: Verfahrensart-Mapping ueber Spalte statt Mapping-Tabelle
-- Lookup: WHERE xbau_code = ? AND bundesland = ?
-- ============================================================================

ALTER TABLE config_verfahrensarten
  ADD COLUMN xbau_code text;

COMMENT ON COLUMN config_verfahrensarten.xbau_code IS 'XBau-Verfahrensart-Code fuer Import-Mapping (ADR-015). NULL wenn Verfahrensart kein XBau-Pendant hat.';

-- Index: Lookup bei XBau-Import (0200 → Verfahrensart ermitteln)
CREATE INDEX idx_config_verfahrensarten_xbau ON config_verfahrensarten(xbau_code, bundesland)
  WHERE xbau_code IS NOT NULL;


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328200000_proj7_xbau_nachrichten_rollback.sql
--
-- DROP INDEX IF EXISTS idx_config_verfahrensarten_xbau;
-- ALTER TABLE config_verfahrensarten DROP COLUMN IF EXISTS xbau_code;
-- DROP TRIGGER IF EXISTS trg_config_xbau_codelisten_updated_at ON config_xbau_codelisten;
-- DROP TABLE IF EXISTS config_xbau_codelisten;
-- DROP TRIGGER IF EXISTS trg_xbau_nachrichten_updated_at ON xbau_nachrichten;
-- DROP TABLE IF EXISTS xbau_nachrichten;
-- ============================================================================
-- PROJ-7: Background Jobs fuer asynchrone XBau-Verarbeitung
-- Migration: 20260328210000_background_jobs.sql
-- ADR-008 (Asynchrone Verarbeitung), ADR-015 (XBau-Nachrichten-Datenmodell)
-- ADR-007 (Multi-Tenancy, Service-Only-Pattern)
--
-- Tabelle:
--   background_jobs (Service-Only, mandantenfaehig)
--   Zentrale Job-Queue fuer alle asynchronen Operationen (XBau-Generierung,
--   Validierung, Parsing, OCR, PDF-Generierung, Export).
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql
--   (tenants, update_updated_at())
-- ============================================================================


-- ============================================================================
-- 1. Tabelle: background_jobs (Service-Only, mandantenfaehig)
-- ADR-008: Zentrale Job-Tabelle als Abstraktionsschicht zwischen API-Routes
--          und Workern (lokal, Edge Function, externer Service).
-- ADR-015: XBau-Service kommuniziert ueber diese Tabelle mit dem Fachverfahren.
-- ============================================================================

CREATE TABLE background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),

  -- Job-Typ: bestimmt welcher Worker den Job verarbeitet
  type text NOT NULL,                           -- z.B. 'xbau_generate', 'xbau_validate', 'xbau_parse',
                                                --      'ocr', 'pdf_generation', 'export', 'frist_erinnerung'

  -- Status-Lifecycle (ADR-008):
  -- pending → processing → completed | failed → (retry) → pending | dead_letter
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),

  -- Eingabedaten: Job-spezifisch (ADR-015 Schnittstellenvertrag)
  -- XBau-Beispiel: {"nachrichtentyp": "0201", "vorgang_id": "...", "payload": {...}}
  input jsonb NOT NULL DEFAULT '{}',

  -- Ergebnisdaten: Erst nach Abschluss gefuellt
  -- XBau-Beispiel: {"nachricht_id": "...", "status": "completed"} oder {"fehler": "..."}
  output jsonb,

  -- Retry-Steuerung (ADR-015: 3 Versuche, 30s/60s/120s Delay)
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  next_retry_at timestamptz,                    -- Naechster Retry-Zeitpunkt (NULL wenn nicht retry-faehig)

  -- Zeitmessung
  started_at timestamptz,                       -- Wann der Worker die Verarbeitung begonnen hat
  completed_at timestamptz,                     -- Wann abgeschlossen (success oder final failure)

  -- Webhook-Callback (ADR-015: XBau-Service ruft Fachverfahren nach Abschluss)
  webhook_url text,                             -- Callback-URL (z.B. /api/internal/xbau/webhook)
  webhook_delivered boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE background_jobs IS 'Service-Only: Zentrale Job-Queue fuer asynchrone Verarbeitung (ADR-008). Zugriff nur ueber Service-Role-Key.';
COMMENT ON COLUMN background_jobs.tenant_id IS 'Mandanten-Zuordnung. Jeder Job gehoert genau einem Tenant.';
COMMENT ON COLUMN background_jobs.type IS 'Job-Typ: xbau_generate, xbau_validate, xbau_parse, ocr, pdf_generation, export, frist_erinnerung.';
COMMENT ON COLUMN background_jobs.status IS 'Lifecycle: pending→processing→completed|failed. Nach max_attempts: dead_letter.';
COMMENT ON COLUMN background_jobs.input IS 'Job-spezifische Eingabedaten als JSON. XBau: {nachrichtentyp, vorgang_id, payload}.';
COMMENT ON COLUMN background_jobs.output IS 'Ergebnisdaten nach Abschluss. XBau: {nachricht_id} oder {fehler}.';
COMMENT ON COLUMN background_jobs.attempts IS 'Anzahl bisheriger Verarbeitungsversuche.';
COMMENT ON COLUMN background_jobs.max_attempts IS 'Maximale Versuche bevor dead_letter (ADR-015: Default 3).';
COMMENT ON COLUMN background_jobs.next_retry_at IS 'Naechster Retry-Zeitpunkt. NULL wenn kein Retry ansteht. Delay: 30s/60s/120s (ADR-015).';
COMMENT ON COLUMN background_jobs.started_at IS 'Zeitpunkt des Verarbeitungsbeginns durch den Worker.';
COMMENT ON COLUMN background_jobs.completed_at IS 'Zeitpunkt des Abschlusses (Erfolg oder finaler Fehlschlag).';
COMMENT ON COLUMN background_jobs.webhook_url IS 'Callback-URL nach Job-Abschluss (ADR-015 Webhook-Ablauf).';
COMMENT ON COLUMN background_jobs.webhook_delivered IS 'TRUE wenn Webhook erfolgreich zugestellt wurde.';


-- ============================================================================
-- 2. RLS: Service-Only (deny-all fuer Client-Rollen, ADR-007)
-- Zugriff erfolgt ausschliesslich ueber Service-Role-Key im Backend.
-- ============================================================================

ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "background_jobs_deny_select" ON background_jobs
  FOR SELECT USING (false);
CREATE POLICY "background_jobs_deny_insert" ON background_jobs
  FOR INSERT WITH CHECK (false);
CREATE POLICY "background_jobs_deny_update" ON background_jobs
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "background_jobs_deny_delete" ON background_jobs
  FOR DELETE USING (false);


-- ============================================================================
-- 3. Indizes
-- Worker-Abfrage: Naechsten ausstehenden Job finden (tenant + status + retry)
-- Status-Abfrage: Jobs eines bestimmten Typs und Status filtern
-- ============================================================================

-- Worker-Poll: SELECT ... WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now())
-- Auch fuer Stuck-Detection: WHERE status = 'processing' AND started_at < now() - interval '10 minutes'
CREATE INDEX idx_background_jobs_worker_poll
  ON background_jobs(tenant_id, status, next_retry_at);

-- Status-Dashboard / Job-Typ-Filterung
CREATE INDEX idx_background_jobs_type_status
  ON background_jobs(tenant_id, type, status);


-- ============================================================================
-- 4. Trigger: updated_at automatisch aktualisieren
-- Nutzt bestehende Funktion aus 20260326100000_proj2_mandanten_schema_rls.sql
-- ============================================================================

CREATE TRIGGER trg_background_jobs_updated_at
  BEFORE UPDATE ON background_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328210000_background_jobs_rollback.sql
--
-- DROP TRIGGER IF EXISTS trg_background_jobs_updated_at ON background_jobs;
-- DROP INDEX IF EXISTS idx_background_jobs_type_status;
-- DROP INDEX IF EXISTS idx_background_jobs_worker_poll;
-- DROP TABLE IF EXISTS background_jobs;
-- ============================================================================
-- PROJ-7: XBau-Versionierung pro Mandant
-- Migration: 20260328220000_tenants_xbau_version.sql
-- ADR-015 (XBau-Nachrichten-Datenmodell): Spalte xbau_version auf tenants
--
-- Rueckwaertskompatibel: NOT NULL mit DEFAULT '2.6' — bestehende Zeilen
-- erhalten automatisch den Default-Wert. Kein Locking-Problem bei kleiner
-- tenants-Tabelle (< 1000 Zeilen).
--
-- Voraussetzung: 20260326100000_proj2_mandanten_schema_rls.sql (tenants)
-- ============================================================================


-- ============================================================================
-- 1. ALTER TABLE: tenants — xbau_version Spalte
-- ADR-015: Routing nach XBau-Version erst bei Parallelbetrieb aktiv.
-- MVP-Default '2.6' — aendert sich erst bei XBau-Standardaktualisierung.
-- ============================================================================

ALTER TABLE tenants
  ADD COLUMN xbau_version text NOT NULL DEFAULT '2.6';

COMMENT ON COLUMN tenants.xbau_version IS 'XBau-Standard-Version fuer diesen Mandanten (ADR-015). Default 2.6. Routing bei Parallelbetrieb mehrerer Versionen.';


-- ============================================================================
-- Rollback-Hinweis
-- ============================================================================
-- Rollback-Script: supabase/rollbacks/20260328220000_tenants_xbau_version_rollback.sql
--
-- ALTER TABLE tenants DROP COLUMN IF EXISTS xbau_version;
