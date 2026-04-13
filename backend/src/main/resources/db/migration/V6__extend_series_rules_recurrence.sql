ALTER TABLE match_series_rules
    ADD COLUMN recurrence_type VARCHAR(30) NOT NULL DEFAULT 'WEEKLY',
    ADD COLUMN interval_days INTEGER,
    ADD COLUMN day_of_month SMALLINT;

ALTER TABLE match_series_rules
    DROP CONSTRAINT IF EXISTS ck_match_series_rules_day;

ALTER TABLE match_series_rules
    ADD CONSTRAINT ck_match_series_rules_recurrence_type
        CHECK (recurrence_type IN ('WEEKLY', 'EVERY_N_DAYS', 'MONTHLY_DAY_OF_MONTH'));

ALTER TABLE match_series_rules
    ADD CONSTRAINT ck_match_series_rules_weekly_day
        CHECK (
            (recurrence_type <> 'WEEKLY')
            OR (day_of_week BETWEEN 1 AND 7)
        );

ALTER TABLE match_series_rules
    ADD CONSTRAINT ck_match_series_rules_every_n_days
        CHECK (
            (recurrence_type <> 'EVERY_N_DAYS')
            OR (interval_days IS NOT NULL AND interval_days > 0)
        );

ALTER TABLE match_series_rules
    ADD CONSTRAINT ck_match_series_rules_monthly_dom
        CHECK (
            (recurrence_type <> 'MONTHLY_DAY_OF_MONTH')
            OR (day_of_month IS NOT NULL AND day_of_month BETWEEN 1 AND 31)
        );

ALTER TABLE match_series_rules
    ADD CONSTRAINT ck_match_series_rules_fields_match_type
        CHECK (
            (recurrence_type = 'WEEKLY' AND interval_days IS NULL AND day_of_month IS NULL)
            OR (recurrence_type = 'EVERY_N_DAYS' AND day_of_month IS NULL)
            OR (recurrence_type = 'MONTHLY_DAY_OF_MONTH' AND interval_days IS NULL)
        );

ALTER TABLE match_series_rules
    DROP CONSTRAINT IF EXISTS uk_match_series_rules;

ALTER TABLE match_series_rules
    ADD CONSTRAINT uk_match_series_rules
        UNIQUE (series_id, recurrence_type, day_of_week, interval_days, day_of_month, start_time);
