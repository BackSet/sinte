-- V18: Move location/target_players from match_series to match_series_rules
-- NOTE: This migration will be superseded by V20 which creates match_configs.
-- We keep the structural changes here but V20 will clean up further.

-- Ensure match_series still has location/target_players before moving
-- (If V14 already deleted data, these may be NULL for existing rows)
ALTER TABLE match_series_rules
    ADD COLUMN IF NOT EXISTS default_match_location VARCHAR(180),
    ADD COLUMN IF NOT EXISTS default_match_target_players INTEGER;

-- Copy from series if columns still exist (safe no-op if already dropped)
-- We use a DO block to handle the case where columns may already be gone
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_series' AND column_name = 'location') THEN
        UPDATE match_series_rules r
            SET default_match_location = s.location,
                default_match_target_players = s.target_players
            FROM match_series s
            WHERE r.series_id = s.id;
    END IF;
END $$;

-- Make NOT NULL (after data migration)
ALTER TABLE match_series_rules ALTER COLUMN default_match_location SET NOT NULL;
ALTER TABLE match_series_rules ALTER COLUMN default_match_target_players SET NOT NULL;

ALTER TABLE match_series_rules
    ADD CONSTRAINT ck_match_series_rules_default_match_target_players
        CHECK (default_match_target_players > 0);

-- Drop from match_series if they exist
ALTER TABLE match_series DROP CONSTRAINT IF EXISTS ck_match_series_target_players;
ALTER TABLE match_series DROP COLUMN IF EXISTS target_players;
ALTER TABLE match_series DROP COLUMN IF EXISTS location;