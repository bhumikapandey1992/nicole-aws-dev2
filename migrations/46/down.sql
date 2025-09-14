
-- Remove all the challenge types we added
DELETE FROM challenge_types WHERE category_id IN (1,2,3,4,5,6,7) AND is_custom = false;

-- Remove the categories (this will cascade if foreign keys are enabled)
DELETE FROM challenge_categories WHERE id IN (1,2,3,4,5,6,7);
