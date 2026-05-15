ALTER TABLE users
    DROP COLUMN IF EXISTS primary_position,
    DROP COLUMN IF EXISTS secondary_position;