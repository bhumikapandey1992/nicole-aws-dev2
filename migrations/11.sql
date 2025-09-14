
-- Insert some sample challenge types for each category
INSERT OR IGNORE INTO challenge_types (category_id, name, unit, suggested_min, suggested_max) VALUES
-- Exercise & Movement (category_id = 1)
(1, 'Kettlebell Swings', 'swings', 50, 200),
(1, 'Push-ups', 'reps', 10, 50),
(1, 'Walking/Running', 'miles', 1, 10),
(1, 'Burpees', 'reps', 5, 30),
(1, 'Squats', 'reps', 20, 100),

-- Light & Circadian (category_id = 2)
(2, 'Morning Light Exposure', 'minutes', 10, 30),
(2, 'Sunrise Viewing', 'days', 7, 30),
(2, 'Evening Light Management', 'days', 7, 30),

-- Low Carb/Keto (category_id = 3)
(3, 'Keto Days', 'days', 7, 30),
(3, 'Carb-Free Meals', 'meals', 10, 60),
(3, 'Sugar-Free Days', 'days', 7, 30),

-- Sleep Recovery (category_id = 4)
(4, 'Early Bedtime', 'days', 7, 30),
(4, 'Sleep Quality Hours', 'hours', 50, 240),
(4, 'Screen-Free Hours Before Bed', 'hours', 7, 60),

-- Resilience Building (category_id = 5)
(5, 'Meditation Minutes', 'minutes', 50, 300),
(5, 'Cold Exposure', 'sessions', 5, 30),
(5, 'Breathing Exercises', 'sessions', 10, 60),

-- Meal Timing (category_id = 6)
(6, 'Intermittent Fasting Days', 'days', 7, 30),
(6, 'Time-Restricted Eating Hours', 'hours', 80, 300);
