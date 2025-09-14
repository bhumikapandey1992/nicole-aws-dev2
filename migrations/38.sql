
-- Insert basic challenge types for each category
INSERT INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
-- Cold Exposure (category_id = 1)
(1, 'Ice Bath Sessions', 'sessions', 10, 30),
(1, 'Cold Shower Minutes', 'minutes', 30, 90),
(1, 'Cold Plunge Days', 'days', 7, 30),

-- Light Therapy (category_id = 2)  
(2, 'Morning Light Exposure', 'sessions', 14, 30),
(2, 'Blue Light Blocking Hours', 'hours', 28, 60),
(2, 'Sunrise Viewing Days', 'days', 7, 30),

-- Meal Timing (category_id = 3)
(3, 'Intermittent Fasting Days', 'days', 14, 30),
(3, 'Time-Restricted Eating Hours', 'hours', 84, 168),
(3, 'Extended Fasting Sessions', 'sessions', 3, 8),

-- Ketogenic Nutrition (category_id = 4)
(4, 'Ketogenic Days', 'days', 14, 60),
(4, 'Carb-Free Meals', 'meals', 21, 90),
(4, 'MCT Oil Doses', 'doses', 14, 30),

-- Mindfulness Practice (category_id = 5)
(5, 'Meditation Sessions', 'sessions', 14, 30),
(5, 'Breathwork Minutes', 'minutes', 70, 150),
(5, 'Mindfulness Days', 'days', 7, 30),

-- Physical Activity (category_id = 6)
(6, 'Workout Sessions', 'sessions', 8, 20),
(6, 'Walking Miles', 'miles', 50, 150),
(6, 'Strength Training Days', 'days', 6, 15),

-- Sleep Optimization (category_id = 7)
(7, 'Quality Sleep Nights', 'nights', 14, 30),
(7, 'Sleep Tracking Days', 'days', 14, 30),
(7, 'Recovery Protocol Sessions', 'sessions', 7, 21),

-- Resilience Building (category_id = 8)
(8, 'Stress Challenge Days', 'days', 7, 21),
(8, 'Resilience Exercises', 'exercises', 14, 30),
(8, 'Adaptation Sessions', 'sessions', 10, 25);
