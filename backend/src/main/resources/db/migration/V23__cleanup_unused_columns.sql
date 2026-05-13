-- V23: Drop unused columns that are already managed by other tables/models

-- users: positions are now in user_positions table
ALTER TABLE users DROP COLUMN IF EXISTS primary_position;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_position;

-- match_series: timezone, location, target_players moved to match_configs
ALTER TABLE match_series DROP COLUMN IF EXISTS timezone;
ALTER TABLE match_series DROP COLUMN IF EXISTS location;
ALTER TABLE match_series DROP COLUMN IF EXISTS target_players;
ALTER TABLE match_series DROP COLUMN IF EXISTS default_location;
ALTER TABLE match_series DROP COLUMN IF EXISTS default_target_players;

-- match_series_rules: duration_minutes and config defaults moved to match_configs
ALTER TABLE match_series_rules DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE match_series_rules DROP COLUMN IF EXISTS default_match_location;
ALTER TABLE match_series_rules DROP COLUMN IF EXISTS default_match_target_players;

-- refresh_tokens: metadata and created_at never read
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS metadata;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS created_at;

-- sinte_group_members: added_by_user_id never read
ALTER TABLE sinte_group_members DROP COLUMN IF EXISTS added_by_user_id;
