-- Clean previous series configuration data for the new recurrence model stage.
UPDATE matches SET series_id = NULL WHERE series_id IS NOT NULL;
DELETE FROM match_series_target_groups;
DELETE FROM match_series_rules;
DELETE FROM match_series;

CREATE UNIQUE INDEX IF NOT EXISTS uk_matches_series_starts_at
    ON matches (series_id, starts_at)
    WHERE series_id IS NOT NULL;
