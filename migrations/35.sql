
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
-- Cold Exposure challenges
(1, 'Ice Bath Sessions', 'sessions', 14, 30),
(1, 'Cold Shower Minutes', 'minutes', 30, 100),
(1, 'Outdoor Cold Exposure', 'sessions', 7, 21),

-- Exercise & Movement challenges
(2, 'Workout Sessions', 'sessions', 20, 50),
(2, 'Exercise Minutes', 'minutes', 300, 1000),
(2, 'Daily Steps', 'days', 14, 60),

-- Intermittent Fasting challenges
(3, 'Fasting Days', 'days', 14, 90),
(3, '16:8 Fasting Hours', 'days', 21, 60),
(3, 'Extended Fasts', 'fasts', 4, 12),

-- Ketogenic Nutrition challenges
(4, 'Ketogenic Days', 'days', 21, 90),
(4, 'Carb-Free Meals', 'meals', 30, 180),
(4, 'Ketosis Testing', 'days', 14, 60),

-- Meditation & Mindfulness challenges
(5, 'Meditation Sessions', 'sessions', 21, 100),
(5, 'Mindfulness Minutes', 'minutes', 200, 1000),
(5, 'Daily Meditation', 'days', 14, 60),

-- Light & Circadian challenges
(6, 'Morning Sun Exposure', 'days', 14, 60),
(6, 'Light Therapy Sessions', 'sessions', 20, 60),
(6, 'Sunrise Viewing', 'days', 21, 90);
