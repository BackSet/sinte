-- Drop unused columns

-- sinte_group_members.added_by_user_id: tracked but never read
ALTER TABLE sinte_group_members DROP COLUMN IF EXISTS added_by_user_id;

-- email_queue.notification_id: FK stored but never traversed
ALTER TABLE email_queue DROP COLUMN IF EXISTS notification_id;

-- refresh_tokens.metadata: always hardcoded, never read
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS metadata;

-- refresh_tokens.created_at: never exposed, token lookup is by hash only
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS created_at;