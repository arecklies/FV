-- ============================================================================
-- Demo-Seed: Testdaten fuer Kunden-Demo
-- Ausfuehrung: Im Supabase Dashboard SQL Editor (mit Service-Role)
--
-- Erstellt:
--   1 Tenant (Kreis Mettmann, NRW)
--   2 Benutzer (Sachbearbeiter + Referatsleiter) — separat in Auth anlegen!
--   3 Verfahrensarten (BG regulaer, BG vereinfacht, Freistellung)
--   1 Workflow-Definition (Baugenehmigung regulaer)
--   3 config_fristen (Gesamtfrist, Beteiligungsfrist, Vollstaendigkeitspruefung)
--   10 Feiertage NRW 2026
--   8 Vorgaenge in verschiedenen Workflow-Stadien
--   6 Fristen mit verschiedenen Ampelstatus
--
-- WICHTIG: Benutzer muessen VORHER in Supabase Auth angelegt werden.
-- Die UUIDs unten muessen durch die echten auth.users.id ersetzt werden.
-- ============================================================================

-- ==============================
-- 0. Platzhalter-UUIDs (ERSETZEN!)
-- ==============================
-- Nach dem Anlegen der Benutzer in Supabase Auth:
--   SELECT id, email FROM auth.users;
-- Dann die UUIDs unten ersetzen.

\set sb_user_id   '''00000000-0000-0000-0000-000000000001'''
\set rl_user_id   '''00000000-0000-0000-0000-000000000002'''

-- ==============================
-- 1. Tenant
-- ==============================

INSERT INTO tenants (id, name, slug, bundesland, settings) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   'Kreis Mettmann — Bauaufsicht',
   'kreis-mettmann',
   'NW',
   '{"aktenzeichen_schema": "{JAHR}/{KUERZEL}-{NR}"}'::jsonb
  );

-- ==============================
-- 2. Tenant-Members (UUIDs ersetzen!)
-- ==============================

-- Sachbearbeiter: demo-sb@bauaufsicht.example
INSERT INTO tenant_members (tenant_id, user_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   :sb_user_id::uuid,
   'sachbearbeiter');

-- Referatsleiter: demo-rl@bauaufsicht.example
INSERT INTO tenant_members (tenant_id, user_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   :rl_user_id::uuid,
   'referatsleiter');

-- ==============================
-- 3. Verfahrensarten (NRW)
-- ==============================

INSERT INTO config_verfahrensarten (id, bundesland, kuerzel, bezeichnung, kategorie, sortierung, rechtsgrundlage) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'NW', 'BG',   'Baugenehmigung (regulär)',     'genehmigung',   1, '§ 64 BauO NRW'),
  ('b0000000-0000-0000-0000-000000000002', 'NW', 'BG-V', 'Baugenehmigung (vereinfacht)',  'genehmigung',   2, '§ 65 BauO NRW'),
  ('b0000000-0000-0000-0000-000000000003', 'NW', 'FR',   'Freistellungsverfahren',        'freistellung',  3, '§ 63 BauO NRW');

-- ==============================
-- 4. Workflow-Definition (BG regulaer, NRW)
-- ==============================

INSERT INTO config_workflows (verfahrensart_id, bundesland, version, definition) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'NW', 1, '{
    "name": "Baugenehmigung regulär (NRW)",
    "version": 1,
    "initialStatus": "eingegangen",
    "schritte": [
      {"id": "eingegangen", "label": "Antrag eingegangen", "typ": "automatisch", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": []},
      {"id": "vollstaendigkeitspruefung", "label": "Vollständigkeitsprüfung", "typ": "manuell", "naechsteSchritte": ["nachforderung", "beteiligung"], "aktionen": [{"id": "vollstaendig", "label": "Vollständig", "ziel": "beteiligung"}, {"id": "unvollstaendig", "label": "Unvollständig → Nachforderung", "ziel": "nachforderung"}], "frist": "vollstaendigkeitspruefung", "hinweis": "Prüfen Sie ob alle Bauvorlagen gemäß BauVorlV eingereicht wurden.", "checkliste": ["Lageplan", "Bauzeichnungen", "Baubeschreibung", "Standsicherheitsnachweis"]},
      {"id": "nachforderung", "label": "Nachforderung", "typ": "manuell", "naechsteSchritte": ["vollstaendigkeitspruefung"], "aktionen": [{"id": "eingegangen", "label": "Unterlagen eingegangen", "ziel": "vollstaendigkeitspruefung"}]},
      {"id": "beteiligung", "label": "ToEB-Beteiligung", "typ": "manuell", "naechsteSchritte": ["pruefung"], "aktionen": [{"id": "abgeschlossen", "label": "Alle Stellungnahmen eingegangen", "ziel": "pruefung"}], "frist": "beteiligungsfrist", "hinweis": "Träger öffentlicher Belange beteiligen."},
      {"id": "pruefung", "label": "Fachliche Prüfung", "typ": "manuell", "naechsteSchritte": ["bescheid_entwurf"], "aktionen": [{"id": "genehmigen", "label": "Genehmigung empfehlen", "ziel": "bescheid_entwurf"}], "frist": "gesamtfrist"},
      {"id": "bescheid_entwurf", "label": "Bescheid erstellen", "typ": "manuell", "naechsteSchritte": ["freizeichnung"], "aktionen": [{"id": "fertig", "label": "Bescheid erstellt → Freigabe", "ziel": "freizeichnung"}]},
      {"id": "freizeichnung", "label": "Freizeichnung (Vier-Augen)", "typ": "freigabe", "minRolle": "referatsleiter", "naechsteSchritte": ["zustellung", "bescheid_entwurf"], "aktionen": [{"id": "freigeben", "label": "Freizeichnen", "ziel": "zustellung"}, {"id": "zurueckweisen", "label": "Zur Überarbeitung", "ziel": "bescheid_entwurf"}]},
      {"id": "zustellung", "label": "Bescheid zustellen", "typ": "manuell", "naechsteSchritte": ["abgeschlossen"], "aktionen": [{"id": "zugestellt", "label": "Bescheid zugestellt", "ziel": "abgeschlossen"}]},
      {"id": "abgeschlossen", "label": "Vorgang abgeschlossen", "typ": "endstatus", "naechsteSchritte": [], "aktionen": []}
    ]
  }'::jsonb);

-- ==============================
-- 5. config_fristen (NRW, BG regulaer)
-- ==============================

INSERT INTO config_fristen (bundesland, verfahrensart_id, typ, bezeichnung, werktage, rechtsgrundlage) VALUES
  ('NW', 'b0000000-0000-0000-0000-000000000001', 'gesamtfrist',                'Gesamtfrist Baugenehmigung',      65, '§ 75 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-0000-0000-000000000001', 'beteiligungsfrist',          'Beteiligungsfrist ToEB',          20, '§ 72 Abs. 1 BauO NRW'),
  ('NW', 'b0000000-0000-0000-0000-000000000001', 'vollstaendigkeitspruefung',  'Vollständigkeitsprüfung',         10, '§ 69 Abs. 2 BauO NRW');

-- ==============================
-- 6. Feiertage NRW 2026
-- ==============================

INSERT INTO config_feiertage (bundesland, datum, bezeichnung, jahr) VALUES
  (NULL,  '2026-01-01', 'Neujahr',                2026),
  (NULL,  '2026-04-03', 'Karfreitag',             2026),
  (NULL,  '2026-04-06', 'Ostermontag',            2026),
  (NULL,  '2026-05-01', 'Tag der Arbeit',         2026),
  (NULL,  '2026-05-14', 'Christi Himmelfahrt',    2026),
  (NULL,  '2026-05-25', 'Pfingstmontag',          2026),
  ('NW', '2026-06-04', 'Fronleichnam',            2026),
  (NULL,  '2026-10-03', 'Tag der Dt. Einheit',    2026),
  ('NW', '2026-11-01', 'Allerheiligen',           2026),
  (NULL,  '2026-12-25', '1. Weihnachtstag',       2026),
  (NULL,  '2026-12-26', '2. Weihnachtstag',       2026);

-- ==============================
-- 7. Demo-Vorgaenge (8 Stueck, verschiedene Stadien)
-- ==============================

INSERT INTO vorgaenge (id, tenant_id, aktenzeichen, verfahrensart_id, bundesland, bauherr_name, bauherr_anschrift, grundstueck_adresse, grundstueck_flurstueck, bezeichnung, workflow_schritt_id, zustaendiger_user_id, eingangsdatum, created_by, extra_felder) VALUES
  -- 1. Frisch eingegangen (gruen)
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0001', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Müller, Hans',      'Hauptstr. 1, 40822 Mettmann',    'Berliner Str. 45, 40822 Mettmann',   'Flur 3, 412/5', 'Neubau Einfamilienhaus',        'eingegangen',                :sb_user_id::uuid, '2026-03-20', :sb_user_id::uuid, '{}'),
  -- 2. In Vollstaendigkeitspruefung (gelb — Frist laeuft)
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0002', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Schmidt, Petra',    'Ringstr. 12, 40878 Ratingen',    'Am Markt 8, 40878 Ratingen',         'Flur 7, 88/2',  'Anbau Doppelgarage',            'vollstaendigkeitspruefung',   :sb_user_id::uuid, '2026-03-01', :sb_user_id::uuid, '{}'),
  -- 3. In Beteiligung (gruen — Frist gerade gestartet)
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0003', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Weber, Thomas',     'Schulstr. 5, 40699 Erkrath',     'Industriestr. 23, 40699 Erkrath',    'Flur 2, 156/1', 'Umbau Lagerhalle zu Büro',      'beteiligung',                :sb_user_id::uuid, '2026-02-15', :sb_user_id::uuid, '{}'),
  -- 4. In Pruefung (rot — Gesamtfrist kritisch)
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0004', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Fischer, Anna',     'Talstr. 77, 40822 Mettmann',     'Düsseldorfer Str. 100, 40822 Mettmann', 'Flur 5, 302/8', 'Neubau Mehrfamilienhaus 6 WE', 'pruefung',                   :sb_user_id::uuid, '2025-12-10', :sb_user_id::uuid, '{}'),
  -- 5. Bescheid-Entwurf (dunkelrot — Frist ueberschritten!)
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0005', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Becker, Klaus',     'Gartenweg 3, 40764 Langenfeld',  'Solinger Str. 55, 40764 Langenfeld',  'Flur 1, 45/12', 'Dachgeschossausbau',            'bescheid_entwurf',           :sb_user_id::uuid, '2025-09-01', :sb_user_id::uuid, '{}'),
  -- 6. Freizeichnung wartend (gehemmt — Nachforderung)
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0006', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Krause, Sabine',    'Moselstr. 8, 40699 Erkrath',     'Hochdahler Str. 22, 40699 Erkrath',   'Flur 4, 78/3',  'Neubau Gewerbegebäude',         'freizeichnung',              :rl_user_id::uuid, '2025-11-15', :sb_user_id::uuid, '{}'),
  -- 7. Zustellung (abgeschlossen, verlaengert)
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0007', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Hoffmann, Martin',  'Parkstr. 15, 40878 Ratingen',    'Bahnhofstr. 1, 40878 Ratingen',       'Flur 9, 221/6', 'Nutzungsänderung Laden→Praxis', 'zustellung',                 :sb_user_id::uuid, '2025-10-20', :sb_user_id::uuid, '{}'),
  -- 8. Abgeschlossen
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '2026/BG-0008', 'b0000000-0000-0000-0000-000000000001', 'NW', 'Lange, Christina',  'Seeweg 42, 40764 Langenfeld',    'Itterstr. 7, 40764 Langenfeld',       'Flur 6, 134/9', 'Carport mit Abstellraum',       'abgeschlossen',              :sb_user_id::uuid, '2025-08-01', :sb_user_id::uuid, '{}');

-- ==============================
-- 8. Demo-Fristen (verschiedene Ampelstatus)
-- ==============================

INSERT INTO vorgang_fristen (tenant_id, vorgang_id, typ, bezeichnung, start_datum, end_datum, werktage, status) VALUES
  -- Vorgang 1: Gruen (frisch, volle Frist)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'gesamtfrist', 'Gesamtfrist Baugenehmigung', '2026-03-20', '2026-06-20', 65, 'gruen'),
  -- Vorgang 2: Gelb (Frist laeuft, 40% verbleibend)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'vollstaendigkeitspruefung', 'Vollständigkeitsprüfung', '2026-03-01', '2026-03-30', 10, 'gelb'),
  -- Vorgang 3: Gruen (Beteiligungsfrist gerade gestartet)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'beteiligungsfrist', 'Beteiligungsfrist ToEB', '2026-03-15', '2026-04-15', 20, 'gruen'),
  -- Vorgang 4: Rot (Gesamtfrist kritisch, < 5 Werktage)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'gesamtfrist', 'Gesamtfrist Baugenehmigung', '2025-12-10', '2026-03-28', 65, 'rot'),
  -- Vorgang 5: Dunkelrot (Frist ueberschritten!)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'gesamtfrist', 'Gesamtfrist Baugenehmigung', '2025-09-01', '2025-12-15', 65, 'dunkelrot'),
  -- Vorgang 6: Gehemmt (Nachforderung laeuft)
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'gesamtfrist', 'Gesamtfrist Baugenehmigung', '2025-11-15', '2026-04-30', 65, 'gehemmt');

-- Hemmung fuer Vorgang 6
UPDATE vorgang_fristen
SET gehemmt = true,
    hemmung_grund = 'Nachforderung: Standsicherheitsnachweis fehlt',
    hemmung_start = '2026-03-01'
WHERE vorgang_id = 'c0000000-0000-0000-0000-000000000006';

-- Verlaengerung fuer Vorgang 5 (zur Demo)
UPDATE vorgang_fristen
SET verlaengert = true,
    verlaengerung_grund = 'Nachforderung gemäß § 69 Abs. 2 BauO NRW',
    original_end_datum = '2025-11-30'
WHERE vorgang_id = 'c0000000-0000-0000-0000-000000000005';

-- ============================================================================
-- FERTIG. Hinweise:
-- 1. Benutzer in Supabase Auth anlegen (Authentication > Users > Add User)
--    - demo-sb@bauaufsicht.example / Passwort: Demo2026!sb
--    - demo-rl@bauaufsicht.example / Passwort: Demo2026!rl
-- 2. UUIDs der Benutzer oben einsetzen (\set sb_user_id / rl_user_id)
-- 3. Dieses Script im SQL Editor ausfuehren
-- 4. App starten: npm run dev → http://localhost:3000
-- ============================================================================
