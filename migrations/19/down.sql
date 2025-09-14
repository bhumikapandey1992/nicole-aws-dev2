
-- Revert the category name change
UPDATE challenge_categories SET name = 'Metabolic Timing' WHERE name = 'Physical Activity';

-- Remove the added categories that didn't exist before
DELETE FROM challenge_categories WHERE name IN (
  'Cold Exposure', 'Light & Circadian', 'Low Carb & Ketogenic', 
  'Meal Timing & Fasting', 'Meditation & Mindfulness', 
  'Sleep Recovery', 'Resilience Building and Self-Regulation'
) AND name NOT IN (
  SELECT DISTINCT name FROM challenge_categories 
  WHERE created_at < datetime('now', '-1 minute')
);

-- Clear challenge types
DELETE FROM challenge_types;
