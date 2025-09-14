
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES 
-- Cold Exposure (category_id = 1)
(1, 'Ice Bath Sessions', 'sessions', 10, 30),
(1, 'Cold Shower Minutes', 'minutes', 30, 100),
(1, 'Cold Plunge Days', 'days', 14, 30),

-- Exercise & Movement (category_id = 2)
(2, 'Workout Sessions', 'sessions', 20, 50),
(2, 'Exercise Minutes', 'minutes', 300, 1000),
(2, 'Active Days', 'days', 21, 60),
(2, 'Steps Walked', 'steps', 100000, 300000),

-- Intermittent Fasting (category_id = 3)
(3, 'Fasting Days', 'days', 14, 30),
(3, 'Fasting Hours', 'hours', 200, 500),
(3, '16:8 Fasting Days', 'days', 21, 60),

-- Ketogenic Nutrition (category_id = 4)
(4, 'Keto Days', 'days', 21, 90),
(4, 'Low-Carb Meals', 'meals', 60, 180),
(4, 'Ketosis Days', 'days', 30, 90),

-- Meditation & Mindfulness (category_id = 5)
(5, 'Meditation Sessions', 'sessions', 30, 100),
(5, 'Meditation Minutes', 'minutes', 300, 1000),
(5, 'Mindful Days', 'days', 21, 60),

-- Sun Exposure (category_id = 6)
(6, 'Sun Exposure Sessions', 'sessions', 30, 60),
(6, 'Sunlight Minutes', 'minutes', 200, 600),
(6, 'Outdoor Days', 'days', 21, 60);
