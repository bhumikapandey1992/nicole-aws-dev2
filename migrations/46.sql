
-- First, ensure we have the basic challenge categories
INSERT OR IGNORE INTO challenge_categories (id, name, icon, description) VALUES 
(1, 'Cold Exposure', 'snowflake', 'Ice baths, cold showers, and other cold therapy interventions'),
(2, 'Physical Activity', 'activity', 'Exercise and movement-based challenges'),
(3, 'Meal Timing', 'clock', 'Intermittent fasting and eating window protocols'),
(4, 'Ketogenic Nutrition', 'salad', 'Low carb and ketogenic dietary approaches'),
(5, 'Light Exposure', 'sun', 'Circadian rhythm and light therapy practices'),
(6, 'Mindfulness & Recovery', 'brain', 'Meditation, breathwork, and stress management'),
(7, 'Resilience Building', 'zap', 'Stress adaptation and mental toughness training');

-- Cold Exposure challenges
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(1, 'Ice Baths', 'sessions', 10, 30, false),
(1, 'Cold Showers', 'sessions', 15, 50, false),
(1, 'Cold Water Swimming', 'sessions', 5, 20, false),
(1, 'Cryotherapy Sessions', 'sessions', 8, 25, false),
(1, 'Cold Exposure Minutes', 'minutes', 60, 300, false);

-- Physical Activity challenges  
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(2, 'Strength Training Sessions', 'sessions', 12, 40, false),
(2, 'Cardio Workouts', 'sessions', 15, 50, false),
(2, 'Walking/Hiking Miles', 'miles', 50, 200, false),
(2, 'Yoga Sessions', 'sessions', 20, 60, false),
(2, 'Push-ups', 'reps', 500, 3000, false),
(2, 'Squats', 'reps', 500, 2500, false),
(2, 'Burpees', 'reps', 100, 1000, false);

-- Meal Timing challenges
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(3, '16:8 Intermittent Fasting', 'days', 14, 90, false),
(3, '18:6 Intermittent Fasting', 'days', 10, 60, false),
(3, 'One Meal a Day (OMAD)', 'days', 7, 30, false),
(3, '24-Hour Fasts', 'fasts', 4, 20, false),
(3, '36-Hour Fasts', 'fasts', 2, 10, false);

-- Ketogenic Nutrition challenges
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(4, 'Ketogenic Days', 'days', 21, 90, false),
(4, 'Low Carb Days (under 50g)', 'days', 14, 60, false),
(4, 'Carnivore Days', 'days', 7, 30, false),
(4, 'Zero Sugar Days', 'days', 14, 60, false),
(4, 'Ketone Testing Days', 'days', 14, 90, false);

-- Light Exposure challenges
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(5, 'Morning Sunlight Exposure', 'sessions', 20, 90, false),
(5, 'Red Light Therapy Sessions', 'sessions', 15, 60, false),
(5, 'Blue Light Blocking Hours', 'hours', 100, 500, false),
(5, 'Outdoor Time Hours', 'hours', 50, 200, false),
(5, 'Sunrise Viewing Sessions', 'sessions', 14, 60, false);

-- Mindfulness & Recovery challenges
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(6, 'Meditation Sessions', 'sessions', 20, 100, false),
(6, 'Breathwork Sessions', 'sessions', 15, 60, false),
(6, 'Gratitude Journaling Days', 'days', 21, 90, false),
(6, 'Quality Sleep Hours', 'hours', 200, 600, false),
(6, 'Digital Detox Hours', 'hours', 50, 300, false);

-- Resilience Building challenges
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) VALUES
(7, 'Sauna Sessions', 'sessions', 10, 40, false),
(7, 'Uncomfortable Challenge Days', 'days', 7, 30, false),
(7, 'Public Speaking Events', 'events', 3, 15, false),
(7, 'Fear-Facing Activities', 'activities', 5, 25, false),
(7, 'Stress Training Sessions', 'sessions', 8, 30, false);
