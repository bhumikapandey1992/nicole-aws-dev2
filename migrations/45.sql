
-- Cold Exposure Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Ice Baths', 'sessions', 10, 30, false FROM challenge_categories WHERE name = 'Cold Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Cold Showers', 'sessions', 14, 60, false FROM challenge_categories WHERE name = 'Cold Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Cold Water Swimming', 'sessions', 5, 20, false FROM challenge_categories WHERE name = 'Cold Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Cryotherapy Sessions', 'sessions', 8, 24, false FROM challenge_categories WHERE name = 'Cold Exposure';

-- Physical Activity Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Strength Training', 'workouts', 20, 60, false FROM challenge_categories WHERE name = 'Physical Activity';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Cardio Sessions', 'workouts', 25, 75, false FROM challenge_categories WHERE name = 'Physical Activity';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Walking/Hiking', 'miles', 50, 200, false FROM challenge_categories WHERE name = 'Physical Activity';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Yoga Sessions', 'sessions', 21, 90, false FROM challenge_categories WHERE name = 'Physical Activity';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Active Recovery Days', 'days', 14, 45, false FROM challenge_categories WHERE name = 'Physical Activity';

-- Meal Timing Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Intermittent Fasting (16:8)', 'days', 14, 60, false FROM challenge_categories WHERE name = 'Meal Timing';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Intermittent Fasting (18:6)', 'days', 10, 45, false FROM challenge_categories WHERE name = 'Meal Timing';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'One Meal a Day (OMAD)', 'days', 7, 30, false FROM challenge_categories WHERE name = 'Meal Timing';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, '24-Hour Fasts', 'fasts', 4, 12, false FROM challenge_categories WHERE name = 'Meal Timing';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Early Eating Window', 'days', 14, 60, false FROM challenge_categories WHERE name = 'Meal Timing';

-- Ketogenic Nutrition Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Ketogenic Days', 'days', 21, 90, false FROM challenge_categories WHERE name = 'Ketogenic Nutrition';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Low Carb Days (under 50g)', 'days', 14, 60, false FROM challenge_categories WHERE name = 'Ketogenic Nutrition';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Carnivore Days', 'days', 7, 30, false FROM challenge_categories WHERE name = 'Ketogenic Nutrition';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Zero Sugar Days', 'days', 14, 45, false FROM challenge_categories WHERE name = 'Ketogenic Nutrition';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Ketone Testing', 'tests', 30, 90, false FROM challenge_categories WHERE name = 'Ketogenic Nutrition';

-- Light Exposure Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Morning Sunlight', 'sessions', 21, 90, false FROM challenge_categories WHERE name = 'Light Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Red Light Therapy', 'sessions', 15, 60, false FROM challenge_categories WHERE name = 'Light Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Blue Light Blocking', 'evenings', 14, 60, false FROM challenge_categories WHERE name = 'Light Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Outdoor Time', 'hours', 50, 200, false FROM challenge_categories WHERE name = 'Light Exposure';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Sunrise Viewing', 'mornings', 21, 90, false FROM challenge_categories WHERE name = 'Light Exposure';

-- Mindfulness & Recovery Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Meditation Sessions', 'sessions', 21, 90, false FROM challenge_categories WHERE name = 'Mindfulness & Recovery';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Breathwork Sessions', 'sessions', 14, 60, false FROM challenge_categories WHERE name = 'Mindfulness & Recovery';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Gratitude Practice', 'days', 21, 90, false FROM challenge_categories WHERE name = 'Mindfulness & Recovery';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Quality Sleep', 'nights', 21, 90, false FROM challenge_categories WHERE name = 'Mindfulness & Recovery';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Digital Detox Hours', 'hours', 30, 120, false FROM challenge_categories WHERE name = 'Mindfulness & Recovery';

-- Resilience Building Challenges
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Stress Exposure Training', 'sessions', 10, 40, false FROM challenge_categories WHERE name = 'Resilience Building';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Sauna Sessions', 'sessions', 12, 50, false FROM challenge_categories WHERE name = 'Resilience Building';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Uncomfortable Challenges', 'challenges', 7, 30, false FROM challenge_categories WHERE name = 'Resilience Building';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'Public Speaking Practice', 'sessions', 5, 20, false FROM challenge_categories WHERE name = 'Resilience Building';

INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max, is_custom) 
SELECT id, 'New Skill Learning', 'hours', 25, 100, false FROM challenge_categories WHERE name = 'Resilience Building';
