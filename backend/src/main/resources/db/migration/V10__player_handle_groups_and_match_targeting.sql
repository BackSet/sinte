ALTER TABLE users
    ADD COLUMN nickname_tag VARCHAR(4);

UPDATE users
SET nickname = lower(trim(COALESCE(nickname, split_part(email, '@', 1))));

UPDATE users
SET nickname = regexp_replace(nickname, '[^a-z0-9_]', '', 'g');

UPDATE users
SET nickname = 'player'
WHERE nickname IS NULL OR nickname = '';

DO $$
DECLARE
    row_user RECORD;
    candidate_tag VARCHAR(4);
BEGIN
    FOR row_user IN SELECT id FROM users LOOP
        LOOP
            candidate_tag := upper(substring(md5(gen_random_uuid()::text) from 1 for 4));
            EXIT WHEN NOT EXISTS (
                SELECT 1
                FROM users
                WHERE nickname = (SELECT nickname FROM users WHERE id = row_user.id)
                  AND nickname_tag = candidate_tag
            );
        END LOOP;

        UPDATE users
        SET nickname_tag = candidate_tag
        WHERE id = row_user.id;
    END LOOP;
END $$;

ALTER TABLE users
    ALTER COLUMN nickname SET NOT NULL,
    ALTER COLUMN nickname_tag SET NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT ck_users_nickname_format CHECK (nickname ~ '^[a-z0-9_]{3,20}$'),
    ADD CONSTRAINT ck_users_nickname_tag_format CHECK (nickname_tag ~ '^[A-Z0-9]{4}$'),
    ADD CONSTRAINT uk_users_nickname_tag UNIQUE (nickname, nickname_tag);

CREATE INDEX idx_users_nickname_tag ON users(nickname, nickname_tag);

CREATE TABLE sinte_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uk_sinte_groups_name_lower ON sinte_groups((lower(name)));

CREATE TABLE sinte_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES sinte_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_sinte_group_members UNIQUE (group_id, user_id)
);

CREATE INDEX idx_sinte_group_members_group ON sinte_group_members(group_id);
CREATE INDEX idx_sinte_group_members_user ON sinte_group_members(user_id);

CREATE TABLE match_target_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES sinte_groups(id) ON DELETE CASCADE,
    CONSTRAINT uk_match_target_groups UNIQUE (match_id, group_id)
);

CREATE INDEX idx_match_target_groups_match ON match_target_groups(match_id);
CREATE INDEX idx_match_target_groups_group ON match_target_groups(group_id);

CREATE TABLE match_series_target_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES match_series(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES sinte_groups(id) ON DELETE CASCADE,
    CONSTRAINT uk_match_series_target_groups UNIQUE (series_id, group_id)
);

CREATE INDEX idx_match_series_target_groups_series ON match_series_target_groups(series_id);
CREATE INDEX idx_match_series_target_groups_group ON match_series_target_groups(group_id);
