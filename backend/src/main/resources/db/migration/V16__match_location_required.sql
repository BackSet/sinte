-- Make location NOT NULL on matches and match_series
ALTER TABLE matches ALTER COLUMN location SET NOT NULL;
ALTER TABLE match_series ALTER COLUMN location SET NOT NULL;