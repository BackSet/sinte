ALTER TABLE match_series
    ADD COLUMN location VARCHAR(180);

ALTER TABLE match_series_rules
    ALTER COLUMN duration_minutes DROP NOT NULL;

ALTER TABLE match_series_rules
    DROP CONSTRAINT IF EXISTS ck_match_series_rules_duration;

ALTER TABLE matches
    ALTER COLUMN ends_at DROP NOT NULL;

ALTER TABLE matches
    DROP CONSTRAINT IF EXISTS ck_matches_time_range;

ALTER TABLE matches
    ADD CONSTRAINT ck_matches_time_range
        CHECK (ends_at IS NULL OR ends_at > starts_at);
