-- V21: Pairing algorithm model
-- Adds shirt_number, description, is_primary, nickname, rol, attendance_open
-- Creates match_pairs table with FK constraints

-- 1. users: add shirt_number (migrate from nickname_tag)
ALTER TABLE users ADD COLUMN shirt_number INTEGER NOT NULL DEFAULT 0;
UPDATE users SET shirt_number = CAST(nickname_tag AS INTEGER) WHERE nickname_tag IS NOT NULL AND nickname_tag ~ '^[0-9]+$';
CREATE UNIQUE INDEX idx_users_nickname_shirt ON users(nickname, shirt_number);

-- 2. positions: add description
ALTER TABLE positions ADD COLUMN description TEXT;

-- 3. user_positions: add is_primary
ALTER TABLE user_positions ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_user_positions_primary ON user_positions(user_id) WHERE is_primary = true;

-- 4. guest_players: add nickname, shirt_number
ALTER TABLE guest_players ADD COLUMN nickname VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE guest_players ADD COLUMN shirt_number INTEGER;

-- 5. guest_player_positions: add is_primary
ALTER TABLE guest_player_positions ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_guest_positions_primary ON guest_player_positions(guest_player_id) WHERE is_primary = true;

-- 6. sinte_group_members: add rol
ALTER TABLE sinte_group_members ADD COLUMN rol VARCHAR(30);

-- 7. matches: add attendance_open
ALTER TABLE matches ADD COLUMN attendance_open BOOLEAN NOT NULL DEFAULT true;

-- 8. Create match_pairs table
CREATE TABLE match_pairs (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_a_id UUID REFERENCES users(id),
    player_b_id UUID REFERENCES users(id),
    guest_player_a_id UUID REFERENCES guest_players(id),
    guest_player_b_id UUID REFERENCES guest_players(id),
    position_code VARCHAR(40) NOT NULL REFERENCES positions(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pair_players CHECK (
        (player_a_id IS NOT NULL OR guest_player_a_id IS NOT NULL) AND
        (player_b_id IS NOT NULL OR guest_player_b_id IS NOT NULL)
    ),
    CONSTRAINT chk_pair_distinct CHECK (
        (player_a_id IS NULL OR player_b_id IS NULL OR player_a_id != player_b_id) AND
        (guest_player_a_id IS NULL OR guest_player_b_id IS NULL OR guest_player_a_id != guest_player_b_id)
    )
);

CREATE INDEX idx_match_pairs_match ON match_pairs(match_id);
CREATE INDEX idx_match_pairs_position ON match_pairs(position_code);

-- 9. match_team_players: add pair_id FK
ALTER TABLE match_team_players ADD COLUMN pair_id UUID REFERENCES match_pairs(id);
CREATE INDEX idx_match_team_players_pair ON match_team_players(pair_id);