ALTER TABLE match_series_rules RENAME COLUMN start_time TO trigger_time;

ALTER TABLE match_series_rules ADD COLUMN match_start_time TIME NOT NULL DEFAULT '20:00';
