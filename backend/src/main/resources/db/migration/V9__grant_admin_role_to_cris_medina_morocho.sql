INSERT INTO roles (code, name)
VALUES ('ADMIN', 'Administrador')
ON CONFLICT (code) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'ADMIN'
WHERE lower(u.email) = lower('cris.medina.morocho@gmail.com')
ON CONFLICT (user_id, role_id) DO NOTHING;
