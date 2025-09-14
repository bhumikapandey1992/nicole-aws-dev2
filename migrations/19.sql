
-- First, ensure all required categories exist
INSERT OR IGNORE INTO challenge_categories (name, icon, description) VALUES 
('Cold Exposure', '❄️', 'Cold exposure activities for metabolic health'),
('Light & Circadian', '☀️', 'Light exposure and circadian rhythm regulation'),
('Low Carb & Ketogenic', '🥑', 'Low-carb and ketogenic nutrition practices'),
('Meal Timing & Fasting', '⏰', 'Meal timing and fasting protocols'),
('Meditation & Mindfulness', '🧘', 'Meditation and mindfulness practices'),
('Physical Activity', '💪', 'Physical activity and exercise'),
('Sleep Recovery', '😴', 'Sleep optimization and recovery'),
('Resilience Building and Self-Regulation', '🧠', 'Resilience building and self-regulation practices');

-- Clean up existing challenge types
DELETE FROM challenge_types;

-- Update the Metabolic Timing category name to Physical Activity if it exists
UPDATE challenge_categories SET name = 'Physical Activity' WHERE name = 'Metabolic Timing';

-- Insert challenge types for Cold Exposure
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Cold Exposure'), 'Ice Baths', 'sessions', 10, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Cold Exposure'), 'Cold Showers', 'sessions', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Cold Exposure'), 'Outdoor Cold Exposure', 'sessions', 7, 21, false);

-- Insert challenge types for Light & Circadian
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Natural Light Exposure (Morning)', 'sessions', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Natural Light Exposure (Noon)', 'sessions', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Natural Light Exposure (Sunset)', 'sessions', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Evening Light Management', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Blue Light Blocking Glasses', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Red Light Therapy', 'sessions', 10, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Light & Circadian'), 'Sunrise Viewing', 'sessions', 14, 30, false);

-- Insert challenge types for Low Carb & Ketogenic
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Low Carb & Ketogenic'), 'Low-Carb or Ketogenic Meal Prep', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Low Carb & Ketogenic'), 'Sugar Free Days', 'days', 7, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Low Carb & Ketogenic'), 'Days in Nutritional Ketosis', 'days', 14, 30, false);

-- Insert challenge types for Meal Timing & Fasting
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Meal Timing & Fasting'), 'Intermittent Fasting', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Meal Timing & Fasting'), 'Fasting Days', 'days', 3, 7, false),
((SELECT id FROM challenge_categories WHERE name = 'Meal Timing & Fasting'), 'Time-Restricted Eating Hours', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Meal Timing & Fasting'), 'Stop Eating 3 Hours Before Sleep', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Meal Timing & Fasting'), 'Fasting Hours', 'hours', 50, 200, false);

-- Insert challenge types for Meditation & Mindfulness
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Meditation & Mindfulness'), 'Mindfulness Practice', 'sessions', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Meditation & Mindfulness'), 'Meditation Practice', 'sessions', 14, 30, false);

-- Insert challenge types for Physical Activity
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Physical Activity'), 'Burpees', 'reps', 50, 300, false),
((SELECT id FROM challenge_categories WHERE name = 'Physical Activity'), 'Kettlebell Swings', 'reps', 100, 500, false),
((SELECT id FROM challenge_categories WHERE name = 'Physical Activity'), 'Push Ups', 'reps', 50, 300, false),
((SELECT id FROM challenge_categories WHERE name = 'Physical Activity'), 'Squats', 'reps', 100, 500, false),
((SELECT id FROM challenge_categories WHERE name = 'Physical Activity'), 'Walking/Running', 'miles', 10, 50, false);

-- Insert challenge types for Sleep Recovery
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Sleep Recovery'), 'Early Bedtime', 'days', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Sleep Recovery'), 'Quality Sleep Hours', 'hours', 100, 250, false),
((SELECT id FROM challenge_categories WHERE name = 'Sleep Recovery'), 'Screen-Free Hours Before Bed', 'hours', 50, 150, false);

-- Insert challenge types for Resilience Building and Self-Regulation
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
((SELECT id FROM challenge_categories WHERE name = 'Resilience Building and Self-Regulation'), 'Breathing Exercises', 'sessions', 14, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Resilience Building and Self-Regulation'), 'Social Connection', 'interactions', 10, 30, false),
((SELECT id FROM challenge_categories WHERE name = 'Resilience Building and Self-Regulation'), 'Mindset Exercises', 'sessions', 14, 30, false);
