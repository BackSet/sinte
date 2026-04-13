CREATE TABLE match_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    timezone VARCHAR(60) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_match_series_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE match_series_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES match_series(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    CONSTRAINT ck_match_series_rules_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_match_series_rules_duration CHECK (duration_minutes > 0),
    CONSTRAINT uk_match_series_rules UNIQUE (series_id, day_of_week, start_time)
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(120) NOT NULL,
    description TEXT,
    location VARCHAR(180),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    series_id UUID REFERENCES match_series(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_matches_status CHECK (status IN ('SCHEDULED', 'CANCELLED', 'FINISHED')),
    CONSTRAINT ck_matches_source_type CHECK (source_type IN ('MANUAL', 'SERIES')),
    CONSTRAINT ck_matches_time_range CHECK (ends_at > starts_at)
);
