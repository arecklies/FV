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
