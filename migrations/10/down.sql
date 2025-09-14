
-- Remove default data
DELETE FROM challenge_types WHERE id BETWEEN 1 AND 14;
DELETE FROM challenge_categories WHERE id BETWEEN 1 AND 6;
DELETE FROM campaigns WHERE id = 1;
