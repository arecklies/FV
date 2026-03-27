-- Rollback: Schwellenwerte-Denormalisierung entfernen
ALTER TABLE vorgang_fristen DROP COLUMN IF EXISTS gelb_ab;
ALTER TABLE vorgang_fristen DROP COLUMN IF EXISTS rot_ab;
