ALTER TABLE users
    ALTER COLUMN nickname_tag TYPE VARCHAR(10),
    ALTER COLUMN nickname_tag SET NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS ck_users_nickname_tag_format,
    ADD CONSTRAINT ck_users_nickname_tag_format CHECK (nickname_tag ~ '^[A-Z0-9]{4,10}$');