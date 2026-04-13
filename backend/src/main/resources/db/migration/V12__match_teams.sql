CREATE TABLE match_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_match_teams_number UNIQUE (match_id, team_number)
);

CREATE TABLE match_team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES match_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_match_team_players UNIQUE (team_id, user_id)
);

CREATE INDEX idx_match_teams_match ON match_teams(match_id);
CREATE INDEX idx_match_team_players_team ON match_team_players(team_id);
CREATE INDEX idx_match_team_players_user ON match_team_players(user_id);
