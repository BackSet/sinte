ALTER TABLE match_series
    ADD COLUMN target_players INTEGER;

ALTER TABLE match_series
    ADD CONSTRAINT ck_match_series_target_players
        CHECK (target_players IS NULL OR target_players > 0);

ALTER TABLE matches
    ADD COLUMN target_players INTEGER,
    ADD COLUMN attendance_open BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE matches
    ADD CONSTRAINT ck_matches_target_players
        CHECK (target_players IS NULL OR target_players > 0);
