
-- Remove all the challenge types we just added
DELETE FROM challenge_types WHERE is_custom = false AND created_by_user_id IS NULL;
