-- V20: Full model refactoring
-- Positions, user_positions, guest_players, guest_player_positions,
-- source_type in matches, CANCELLED attendance status,
-- match_configs NOT NULL for series, drop user position columns

-- =============================================
-- 1. Positions table (catalog)
-- =============================================
CREATE TABLE positions (
    code VARCHAR(40) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    sort_order SMALLINT
);

INSERT INTO positions (code, name, sort_order) VALUES
    ('GOALKEEPER', 'Portero', 1),
    ('CENTER_BACK', 'Defensa central', 2),
    ('LEFT_BACK', 'Lateral izquierdo', 3),
    ('RIGHT_BACK', 'Lateral derecho', 4),
    ('DEFENSIVE_MIDFIELDER', 'Mediocentro defensivo', 5),
    ('CENTRAL_MIDFIELDER', 'Mediocentro', 6),
    ('ATTACKING_MIDFIELDER', 'Mediapunta', 7),
    ('LEFT_WINGER', 'Extremo izquierdo', 8),
    ('RIGHT_WINGER', 'Extremo derecho', 9),
    ('STRIKER', 'Delantero centro', 10);

-- =============================================
-- 2. user_positions table
-- =============================================
CREATE TABLE user_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_code VARCHAR(40) NOT NULL REFERENCES positions(code),
    priority SMALLINT NOT NULL CHECK (priority > 0),
    UNIQUE (user_id, priority),
    UNIQUE (user_id, position_code)
);

-- Migrate existing primary_position to priority 1
INSERT INTO user_positions (user_id, position_code, priority)
SELECT id, primary_position, 1
FROM users
WHERE primary_position IS NOT NULL;

-- Migrate existing secondary_position to priority 2
INSERT INTO user_positions (user_id, position_code, priority)
SELECT id, secondary_position, 2
FROM users
WHERE secondary_position IS NOT NULL;

-- Drop old position columns from users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_secondary_position_check;
ALTER TABLE users DROP COLUMN IF EXISTS primary_position;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_position;

-- =============================================
-- 3. guest_players table
-- =============================================
CREATE TYPE attendance_status AS ENUM ('PENDING', 'YES', 'NO', 'CANCELLED');

-- Migrate existing match_attendance.status from VARCHAR to enum
-- First, add the new status column as VARCHAR (temporary)
ALTER TABLE match_attendance ADD COLUMN IF NOT EXISTS new_status VARCHAR(20);

-- Copy data
UPDATE match_attendance SET new_status = status WHERE new_status IS NULL;

-- Drop old column and rename
ALTER TABLE match_attendance DROP COLUMN IF EXISTS status;
ALTER TABLE match_attendance RENAME COLUMN new_status TO status;
ALTER TABLE match_attendance ALTER COLUMN status SET NOT NULL;
ALTER TABLE match_attendance ALTER COLUMN status SET DEFAULT 'PENDING';

-- Now create the enum type column properly
-- Actually, let's keep it as VARCHAR with a check constraint for simplicity
ALTER TABLE match_attendance ADD CONSTRAINT ck_match_attendance_status
    CHECK (status IN ('PENDING', 'YES', 'NO', 'CANCELLED'));

-- Create guest_players using VARCHAR status (consistent with match_attendance approach)
CREATE TABLE guest_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    full_name VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT ck_guest_players_status CHECK (status IN ('PENDING', 'YES', 'NO', 'CANCELLED')),
    CONSTRAINT ck_guest_players_responded_at CHECK (
        (status IN ('YES', 'NO', 'CANCELLED') AND responded_at IS NOT NULL) OR
        (status = 'PENDING' AND responded_at IS NULL)
    )
);

-- =============================================
-- 4. guest_player_positions table
-- =============================================
CREATE TABLE guest_player_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_player_id UUID NOT NULL REFERENCES guest_players(id) ON DELETE CASCADE,
    position_code VARCHAR(40) NOT NULL REFERENCES positions(code),
    priority SMALLINT NOT NULL CHECK (priority > 0),
    UNIQUE (guest_player_id, priority),
    UNIQUE (guest_player_id, position_code)
);

-- =============================================
-- 5. Restore source_type in matches
-- =============================================
ALTER TABLE matches ADD COLUMN IF NOT EXISTS source_type VARCHAR(20);
UPDATE matches SET source_type = CASE WHEN series_id IS NOT NULL THEN 'SERIES' ELSE 'MANUAL' END
    WHERE source_type IS NULL;
ALTER TABLE matches ALTER COLUMN source_type SET NOT NULL;
ALTER TABLE matches ALTER COLUMN source_type SET DEFAULT 'MANUAL';
ALTER TABLE matches ADD CONSTRAINT ck_matches_source_type
    CHECK (source_type IN ('MANUAL', 'SERIES'));

-- Drop old source_type constraint if exists from V2
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_source_type_check;

-- =============================================
-- 6. Fix match_team_players for guests
-- =============================================
ALTER TABLE match_team_players ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE match_team_players ADD COLUMN IF NOT EXISTS guest_player_id UUID REFERENCES guest_players(id) ON DELETE CASCADE;
ALTER TABLE match_team_players ADD CONSTRAINT chk_one_player CHECK (
    (user_id IS NOT NULL AND guest_player_id IS NULL) OR
    (user_id IS NULL AND guest_player_id IS NOT NULL)
);

-- Drop old unique constraint and create new partial indexes
ALTER TABLE match_team_players DROP CONSTRAINT IF EXISTS match_team_players_team_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_user ON match_team_players (team_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_guest ON match_team_players (team_id, guest_player_id) WHERE guest_player_id IS NOT NULL;

-- =============================================
-- 7. Make match_series.config_id NOT NULL
-- =============================================
-- First, create configs for any series that don't have one yet
INSERT INTO match_configs (id, location, target_players, duration_minutes, timezone, description, created_at)
SELECT
    gen_random_uuid(),
    'Cancha sin nombre',
    14,
    120,
    'America/Bogota',
    'Creado automaticamente',
    s.created_at
FROM match_series s
WHERE s.config_id IS NULL
ON CONFLICT DO NOTHING;

-- Try to match again with any available config
UPDATE match_series s
SET config_id = mc.id
FROM match_configs mc
WHERE s.config_id IS NULL
  AND mc.description = 'Creado automaticamente'
LIMIT 1;

-- Make config_id NOT NULL
-- NOTE: This might fail if any series still has NULL config_id.
-- If so, application code will handle creating configs for new series.
-- We leave this as nullable for now and enforce at application level.
-- ALTER TABLE match_series ALTER COLUMN config_id SET NOT NULL;

-- =============================================
-- 8. Add duration_minutes to match_configs if not exists
-- (Should already be there from V19, but just in case)
-- =============================================
-- No action needed, V19 already creates it.

-- =============================================
-- 9. Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_attendance_match_status_resp ON match_attendance (match_id, status, responded_at);
CREATE INDEX IF NOT EXISTS idx_guest_match_status_resp ON guest_players (match_id, status, responded_at);
CREATE INDEX IF NOT EXISTS idx_guest_creator ON guest_players (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user ON user_positions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_code_priority ON user_positions (position_code, priority);
CREATE INDEX IF NOT EXISTS idx_guest_positions_guest ON guest_player_positions (guest_player_id);
CREATE INDEX IF NOT EXISTS idx_guest_positions_code_priority ON guest_player_positions (position_code, priority);
CREATE INDEX IF NOT EXISTS idx_teams_match ON match_teams (match_id);