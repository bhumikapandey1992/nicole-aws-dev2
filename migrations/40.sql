
-- Delete all duplicate challenge categories, keeping only one of each unique name
DELETE FROM challenge_categories WHERE id NOT IN (
  SELECT MIN(id) FROM challenge_categories GROUP BY name
);

-- Delete all duplicate challenge types, keeping only one of each unique name per category
DELETE FROM challenge_types WHERE id NOT IN (
  SELECT MIN(id) FROM challenge_types GROUP BY category_id, name
);

-- Update the Low Carb & Ketogenic category icon to salad
UPDATE challenge_categories SET icon = 'Salad' WHERE name = 'Low Carb & Ketogenic';
