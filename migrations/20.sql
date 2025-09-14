
-- Delete duplicate categories that were created in the latest migration (no challenge types assigned)
DELETE FROM challenge_categories WHERE id IN (13, 14, 15, 16, 17, 19);

-- Update Exercise & Movement to Physical Activity
UPDATE challenge_categories 
SET name = 'Physical Activity', 
    description = 'Physical activity and exercise',
    icon = '💪',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Update old Resilience Building to match new name
UPDATE challenge_categories 
SET name = 'Resilience Building and Self-Regulation', 
    description = 'Resilience building and self-regulation practices',
    icon = '🧠',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 5;

-- Delete the duplicate new category (id 20) since we updated the old one (id 5)
DELETE FROM challenge_categories WHERE id = 20;

-- Update any challenge types that were assigned to the duplicate category
UPDATE challenge_types SET category_id = 5 WHERE category_id = 20;

-- Update challenge types that were assigned to Exercise & Movement to Physical Activity  
UPDATE challenge_types SET category_id = 1 WHERE category_id = 18;

-- Delete the duplicate Physical Activity category
DELETE FROM challenge_categories WHERE id = 18;
