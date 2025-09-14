
-- Restore the original categories
INSERT INTO challenge_categories (id, name, description, icon, created_at, updated_at) VALUES
(8, 'Exercise & Movement', 'Physical activities and workouts to support metabolic function and mental clarity', '🏃', '2025-08-15 19:59:25', '2025-08-15 19:59:25'),
(9, 'Intermittent Fasting', 'Structured eating windows to promote metabolic flexibility and cognitive benefits', '⏰', '2025-08-15 19:59:25', '2025-08-15 19:59:25'),
(10, 'Ketogenic Nutrition', 'Following ketogenic principles to support brain health and metabolic function', '🥗', '2025-08-15 19:59:25', '2025-08-15 19:59:25'),
(12, 'Sun Exposure', 'Natural light exposure to support circadian rhythms and vitamin D synthesis', '☀️', '2025-08-15 19:59:25', '2025-08-15 19:59:25');

-- Restore original category names and descriptions
UPDATE challenge_categories SET name = 'Light & Circadian', description = 'Light & Circadian Regulation' WHERE id = 2;
UPDATE challenge_categories SET name = 'Low Carb/Keto', description = 'Low Carb and/or Ketogenic Nutrition' WHERE id = 3;
UPDATE challenge_categories SET name = 'Meal Timing', description = 'Metabolic Timing & Fasting' WHERE id = 6;

-- Move challenge types back to their original categories (this is approximate based on the data we saw)
UPDATE challenge_types SET category_id = 6 WHERE name IN ('Outdoor Days', 'Sun Exposure Sessions', 'Sunlight Minutes');
UPDATE challenge_types SET category_id = 4 WHERE name IN ('Keto Days', 'Ketosis Days', 'Low-Carb Meals');
UPDATE challenge_types SET category_id = 3 WHERE name IN ('16:8 Fasting Days', 'Fasting Days', 'Fasting Hours');
UPDATE challenge_types SET category_id = 8 WHERE category_id = 1 AND name IN ('Cold Plunge Days', 'Cold Shower Minutes', 'Ice Bath Sessions', 'Active Days', 'Exercise Minutes', 'Steps Walked', 'Workout Sessions');
UPDATE challenge_types SET category_id = 1 WHERE name IN ('Ice Bath Sessions', 'Cold Shower Minutes', 'Cold Plunge Days');
