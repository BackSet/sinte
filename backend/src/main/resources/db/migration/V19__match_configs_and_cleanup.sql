-- V19: Create match_configs table and wire up references
-- After V18, match_series has no location/target_players; they're in match_series_rules.
-- V19 creates match_configs as the central config, migrates data from series_rules,
-- and adds config_id to match_series and matches.

-- 1. Create match_configs table
CREATE TABLE match_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location VARCHAR(180) NOT NULL,
    target_players INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    timezone VARCHAR(60) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_match_configs_target_players CHECK (target_players > 0),
    CONSTRAINT ck_match_configs_duration CHECK (duration_minutes > 0)
);

-- 2. Migrate data from match_series + match_series_rules into match_configs
-- Each series gets its own config from its first rule's location/target_players and the series' timezone
INSERT INTO match_configs (id, location, target_players, duration_minutes, timezone, created_at)
SELECT
    gen_random_uuid(),
    r.default_match_location,
    r.default_match_target_players,
    120,
    s.timezone,
    s.created_at
FROM match_series s
JOIN match_series_rules r ON r.series_id = s.id
WHERE r.default_match_location IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Add config_id to match_series (nullable first for migration)
ALTER TABLE match_series ADD COLUMN IF NOT EXISTS config_id UUID;

-- Link series to their config (match by timezone + location + target_players)
UPDATE match_series s
SET config_id = mc.id
FROM match_configs mc
JOIN match_series_rules r ON r.series_id = s.id AND r.default_match_location = mc.location AND r.default_match_target_players = mc.target_players
WHERE mc.timezone = s.timezone
  AND s.config_id IS NULL;

-- Make config_id NOT NULL (series must have a config)
-- NOTE: If there are series without rules, they won't have a config yet.
-- We handle this in application logic.

ALTER TABLE match_series ADD CONSTRAINT fk_match_series_config
    FOREIGN KEY (config_id) REFERENCES match_configs(id) ON DELETE RESTRICT;

-- 4. Add config_id to matches (nullable - manual matches may or may not have one)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS config_id UUID;
ALTER TABLE matches ADD CONSTRAINT fk_matches_config
    FOREIGN KEY (config_id) REFERENCES match_configs(id) ON DELETE SET NULL;

-- 5. Migrate existing match data into match_configs
-- Create a config for each unique (location, target_players) combo from matches
INSERT INTO match_configs (id, location, target_players, duration_minutes, timezone, description, created_at)
SELECT DISTINCT ON (m.location, m.target_players)
    gen_random_uuid(),
    COALESCE(m.location, 'Cancha sin nombre'),
    COALESCE(m.target_players, 14),
    120,
    COALESCE(s.timezone, 'America/Bogota'),
    m.description,
    m.created_at
FROM matches m
LEFT JOIN match_series s ON m.series_id = s.id
WHERE m.location IS NOT NULL OR m.target_players IS NOT NULL
ORDER BY m.location, m.target_players, m.created_at;

-- Link matches to their config
UPDATE matches m
SET config_id = mc.id
FROM match_configs mc
WHERE mc.location = COALESCE(m.location, 'Cancha sin nombre')
  AND mc.target_players = COALESCE(m.target_players, 14)
  AND m.config_id IS NULL;

-- 6. Clean match_series_rules: remove default_match_location and default_match_target_players
-- (These are now in match_configs referenced via match_series.config_id)
ALTER TABLE match_series_rules DROP CONSTRAINT IF EXISTS ck_match_series_rules_default_match_target_players;
ALTER TABLE match_series_rules DROP COLUMN IF EXISTS default_match_location;
ALTER TABLE match_series_rules DROP COLUMN IF EXISTS default_match_target_players;

-- 7. Remove match_series.timezone (now in match_configs)
ALTER TABLE match_series DROP COLUMN IF EXISTS timezone;

-- 8. Remove attendance_open from matches (derived, not persisted)
ALTER TABLE matches DROP COLUMN IF EXISTS attendance_open;

-- 9. Make matches.title nullable (can be calculated from starts_at)
ALTER TABLE matches ALTER COLUMN title DROP NOT NULL;