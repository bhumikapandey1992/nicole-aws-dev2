
-- Remove the inserted challenge categories
DELETE FROM challenge_categories WHERE name IN (
'Cold Exposure', 'Light Therapy', 'Meal Timing', 'Ketogenic Nutrition', 
'Mindfulness Practice', 'Physical Activity', 'Sleep Optimization', 'Resilience Building'
);
