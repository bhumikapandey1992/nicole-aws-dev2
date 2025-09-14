
ALTER TABLE challenge_types ADD COLUMN is_custom BOOLEAN DEFAULT false;
ALTER TABLE challenge_types ADD COLUMN created_by_user_id TEXT;
