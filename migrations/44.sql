
-- Insert challenge types for each category
-- Cold Exposure (category_id = 1)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(1, 'Ice Baths', 'sessions', 10, 50),
(1, 'Cold Showers', 'sessions', 14, 100),
(1, 'Cold Plunges', 'sessions', 5, 30),
(1, 'Cold Exposure Minutes', 'minutes', 30, 300);

-- Exercise & Movement (category_id = 2)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(2, 'Workout Sessions', 'sessions', 20, 100),
(2, 'Walking/Running Miles', 'miles', 50, 500),
(2, 'Strength Training Sessions', 'sessions', 15, 75),
(2, 'Exercise Minutes', 'minutes', 300, 2000);

-- Intermittent Fasting (category_id = 3)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(3, 'Fasting Days', 'days', 14, 90),
(3, '16:8 Fasting Days', 'days', 21, 100),
(3, 'Extended Fasts', 'fasts', 5, 20),
(3, 'Fasting Hours', 'hours', 200, 1000);

-- Low Carb & Ketogenic (category_id = 4)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(4, 'Ketogenic Days', 'days', 21, 100),
(4, 'Low Carb Days', 'days', 30, 180),
(4, 'Carb-Free Meals', 'meals', 50, 300),
(4, 'Keto Weeks', 'weeks', 4, 24);

-- Light & Circadian (category_id = 5)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(5, 'Morning Sun Exposure', 'sessions', 21, 100),
(5, 'Light Therapy Sessions', 'sessions', 14, 60),
(5, 'Sunrise Views', 'sessions', 30, 100),
(5, 'Natural Light Minutes', 'minutes', 300, 1500);

-- Meditation & Mindfulness (category_id = 6)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(6, 'Meditation Sessions', 'sessions', 21, 100),
(6, 'Mindfulness Minutes', 'minutes', 200, 1000),
(6, 'Breathing Exercises', 'sessions', 30, 150),
(6, 'Mindfulness Days', 'days', 14, 90);

-- Sleep Optimization (category_id = 7)
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
(7, 'Optimal Sleep Nights', 'nights', 21, 100),
(7, 'Sleep Tracking Days', 'days', 30, 180),
(7, 'Morning Routine Days', 'days', 21, 90),
(7, 'Evening Routine Days', 'days', 21, 90);
