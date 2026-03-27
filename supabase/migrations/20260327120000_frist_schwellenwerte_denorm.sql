-- PROJ-34 Fix: Denormalisiere gelb_ab/rot_ab auf vorgang_fristen
-- Damit kann der Cron-Job konfigurierte Schwellenwerte direkt lesen.

ALTER TABLE vorgang_fristen ADD COLUMN gelb_ab integer;
ALTER TABLE vorgang_fristen ADD COLUMN rot_ab integer;
