-- V22: Fix missing shirt_number column in users
-- V21 added this column but it appears it didn't apply to the users table
-- This migration ensures the column exists

ALTER TABLE users ADD COLUMN shirt_number INTEGER;
UPDATE users SET shirt_number = CAST(nickname_tag AS INTEGER) WHERE nickname_tag IS NOT NULL AND nickname_tag ~ '^[0-9]+$';
UPDATE users SET shirt_number = 0 WHERE shirt_number IS NULL;
ALTER TABLE users ALTER COLUMN shirt_number SET NOT NULL;
ALTER TABLE users ALTER COLUMN shirt_number SET DEFAULT 0;

-- Also ensure idx_users_nickname_shirt index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_shirt ON users(nickname, shirt_number);