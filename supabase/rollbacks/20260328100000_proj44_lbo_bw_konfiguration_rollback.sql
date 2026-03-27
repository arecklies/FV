-- PROJ-44 Rollback: LBO Baden-Wuerttemberg Konfiguration entfernen
-- Ausfuehrung: SQL manuell via Supabase Dashboard SQL Editor oder psql
-- Danach: supabase migration repair --status reverted 20260328100000
--
-- WICHTIG: Nur ausfuehrbar wenn noch KEINE BW-Vorgaenge angelegt wurden.
-- Falls BW-Vorgaenge existieren, muessen diese vorher geloescht werden:
--   DELETE FROM vorgang_workflow_schritte WHERE vorgang_id IN (SELECT id FROM vorgaenge WHERE bundesland = 'BW');
--   DELETE FROM vorgang_fristen WHERE bundesland = 'BW';
--   DELETE FROM vorgang_kommentare WHERE vorgang_id IN (SELECT id FROM vorgaenge WHERE bundesland = 'BW');
--   DELETE FROM vorgaenge WHERE bundesland = 'BW';

-- Reihenfolge: abhaengige Tabellen zuerst (FK-Constraints)

-- 1. Feiertage BW
DELETE FROM config_feiertage WHERE bundesland = 'BW';

-- 2. Fristen BW
DELETE FROM config_fristen WHERE bundesland = 'BW';

-- 3. Workflows BW
DELETE FROM config_workflows WHERE bundesland = 'BW';

-- 4. Verfahrensarten BW (zuletzt, da FK-Ziel)
DELETE FROM config_verfahrensarten WHERE bundesland = 'BW';
