
-- Remove the inserted challenge types
DELETE FROM challenge_types WHERE category_id IN (1, 2, 3, 4, 5, 6, 7, 8) AND is_custom = false;
