-- ============================================================================
-- Cloud-Setup: Migrationen + Seed-Daten fuer Supabase Cloud
--
-- REIHENFOLGE:
-- 1. Migrationen 1-8 (Tabellenstruktur)
-- 2. Seed-Daten (Tenant, Verfahrensarten, Workflows, Fristen, Feiertage)
--    OHNE auth.users (Benutzer werden ueber Supabase Auth-Dashboard erstellt)
-- 3. Migrationen 9-13 (abhaengig von Seed-Daten)
--
-- Ausfuehrung: Supabase Dashboard > SQL Editor > gesamtes Script einfuegen > Run
--
-- NACH dem Script:
-- 1. Benutzer im Auth-Dashboard erstellen (Authentication > Users > Add User)
-- 2. tenant_members manuell einfuegen mit der User-ID aus dem Dashboard
-- ============================================================================

-- ===== SCHRITT 1: Migrationen die keine Seed-Daten brauchen =====
-- (Hier den Inhalt von Migrationen 1-8 einfuegen — bereits im combined-Script)
-- Wir nehmen an, das combined-Script wird in Teilen ausgefuehrt.
-- Dieses Script enthaelt NUR die Seed-Daten und die fehlerbehafteten Migrationen.

-- ===== SCHRITT 2: Seed-Daten (OHNE auth.users) =====

-- 2a. Tenant
INSERT INTO tenants (id, name, slug, bundesland, settings) VALUES
  ('a0000000-0000-4000-8000-000000000001',
   'Kreis Mettmann — Bauaufsicht',
   'kreis-mettmann',
   'NW',
   '{"aktenzeichen_schema": "{JAHR}/{KUERZEL}-{NR}"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2b. NRW-Verfahrensarten
INSERT INTO config_verfahrensarten (id, bundesland, kuerzel, bezeichnung, kategorie, sortierung, rechtsgrundlage) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'NW', 'BG',   'Baugenehmigung (regulär)',     'genehmigung',   1, '§ 64 BauO NRW'),
  ('b0000000-0000-4000-8000-000000000002', 'NW', 'BG-V', 'Baugenehmigung (vereinfacht)',  'genehmigung',   2, '§ 65 BauO NRW'),
  ('b0000000-0000-4000-8000-000000000003', 'NW', 'FR',   'Freistellungsverfahren',        'freistellung',  3, '§ 63 BauO NRW')
ON CONFLICT (bundesland, kuerzel) DO NOTHING;

-- 2c. Workflow-Definition (BG regulaer, NRW)
INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'NW', 1, '{
    "name": "Baugenehmigung regulär (NRW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "beteiligung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "beteiligung"}, {"id": "unvollstaendig", "label": "Unvollständig", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung"},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}]},
      {"id": "beteiligung", "label": "ToEB-Beteiligung", "typ": "manuell", "naechsteSchritte": ["pruefung"], "aktionen": [{"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}], "frist": "beteiligungsfrist"},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist"},
      {"id": "bescheid_entwurf", "label": "Bescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Bescheid erstellt", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Bescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}]},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb)
ON CONFLICT (verfahrensart_id, bundesland, version) DO NOTHING;

-- 2d. Fristen NRW
INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('NW', 'b0000000-0000-4000-8000-000000000001', 'gesamtfrist',                'Gesamtfrist Baugenehmigung',      65, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000001', 'beteiligungsfrist',          'Beteiligungsfrist ToEB',          20, '§ 72 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-4000-8000-000000000001', 'vollstaendigkeitspruefung',  'Vollständigkeitsprüfung',         10, '§ 69 Abs. 2 BauO NRW')
ON CONFLICT (bundesland, verfahrensart_id, typ) DO NOTHING;

-- 2e. Feiertage 2026 (bundesweit + NRW)
INSERT INTO config_feiertage (bundesland, datum, bezeichnung, jahr) VALUES
  (NULL, '2026-01-01', 'Neujahr',              2026),
  (NULL, '2026-04-03', 'Karfreitag',           2026),
  (NULL, '2026-04-06', 'Ostermontag',          2026),
  (NULL, '2026-05-01', 'Tag der Arbeit',       2026),
  (NULL, '2026-05-14', 'Christi Himmelfahrt',  2026),
  (NULL, '2026-05-25', 'Pfingstmontag',        2026),
  ('NW', '2026-06-04', 'Fronleichnam',         2026),
  (NULL, '2026-10-03', 'Tag der Dt. Einheit',  2026),
  ('NW', '2026-11-01', 'Allerheiligen',        2026),
  (NULL, '2026-12-25', '1. Weihnachtstag',     2026),
  (NULL, '2026-12-26', '2. Weihnachtstag',     2026)
ON CONFLICT DO NOTHING;

-- ===== HINWEIS =====
-- Nach diesem Script:
-- 1. Benutzer im Supabase Auth-Dashboard erstellen
-- 2. tenant_members einfuegen:
--    INSERT INTO tenant_members (tenant_id, user_id, role) VALUES
--      ('a0000000-0000-4000-8000-000000000001', '<USER-ID-AUS-DASHBOARD>', 'sachbearbeiter');
