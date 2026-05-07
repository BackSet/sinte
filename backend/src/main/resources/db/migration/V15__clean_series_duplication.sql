-- Drop orphaned default_location and default_target_players columns from match_series
ALTER TABLE match_series DROP COLUMN IF EXISTS default_location;
ALTER TABLE match_series DROP COLUMN IF EXISTS default_target_players;

-- Drop source_type from matches (inferred from series_id IS NULL now)
ALTER TABLE matches DROP COLUMN IF EXISTS source_type;

-- Drop orphaned match_series_rules.duration_minutes (was never used properly)
ALTER TABLE match_series_rules DROP COLUMN IF EXISTS duration_minutes;