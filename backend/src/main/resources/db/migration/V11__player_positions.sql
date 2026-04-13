ALTER TABLE users
    ADD COLUMN primary_position VARCHAR(40),
    ADD COLUMN secondary_position VARCHAR(40);

UPDATE users
SET primary_position = 'CENTRAL_MIDFIELDER'
WHERE primary_position IS NULL;

ALTER TABLE users
    ALTER COLUMN primary_position SET NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT ck_users_primary_position CHECK (
        primary_position IN (
            'GOALKEEPER',
            'CENTER_BACK',
            'LEFT_BACK',
            'RIGHT_BACK',
            'DEFENSIVE_MIDFIELDER',
            'CENTRAL_MIDFIELDER',
            'ATTACKING_MIDFIELDER',
            'LEFT_WINGER',
            'RIGHT_WINGER',
            'STRIKER'
        )
    ),
    ADD CONSTRAINT ck_users_secondary_position CHECK (
        secondary_position IS NULL
        OR secondary_position IN (
            'GOALKEEPER',
            'CENTER_BACK',
            'LEFT_BACK',
            'RIGHT_BACK',
            'DEFENSIVE_MIDFIELDER',
            'CENTRAL_MIDFIELDER',
            'ATTACKING_MIDFIELDER',
            'LEFT_WINGER',
            'RIGHT_WINGER',
            'STRIKER'
        )
    ),
    ADD CONSTRAINT ck_users_secondary_differs CHECK (
        secondary_position IS NULL OR secondary_position <> primary_position
    );
