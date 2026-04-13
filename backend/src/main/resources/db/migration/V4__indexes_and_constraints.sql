CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

CREATE INDEX idx_matches_starts_at_status ON matches(starts_at, status);
CREATE INDEX idx_matches_creator ON matches(created_by_user_id);
CREATE INDEX idx_matches_series ON matches(series_id);

CREATE INDEX idx_match_attendance_match_status ON match_attendance(match_id, status);
CREATE INDEX idx_match_attendance_user ON match_attendance(user_id);

CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_email_queue_status_next_attempt ON email_queue(status, next_attempt_at);
