
-- Insert default challenge categories if they don't exist
INSERT OR IGNORE INTO challenge_categories (id, name, icon, description) VALUES
(1, '💪 Movement (Metabolic Drive)', 'Activity', 'Physical activities that boost metabolic function'),
(2, '🌞 Light & Circadian Regulation', 'Sun', 'Light exposure and circadian rhythm optimization'),
(3, '🥩 Low Carb and/or Ketogenic Nutrition', 'Salad', 'Dietary approaches for metabolic health'),
(4, '😴 Sleep Recovery', 'Moon', 'Sleep quality and recovery optimization'),
(5, '🧘 Resilience Building and Self-Regulation', 'Heart', 'Stress management and emotional regulation'),
(6, '⏰ Meal Timing', 'Clock', 'Intermittent fasting and meal timing strategies');

-- Insert default challenge types if they don't exist
INSERT OR IGNORE INTO challenge_types (id, category_id, name, unit, suggested_min, suggested_max) VALUES
-- Movement challenges
(1, 1, 'Kettlebell Swings', 'swings', 100, 1000),
(2, 1, 'Push-ups', 'reps', 50, 500),
(3, 1, 'Walking', 'miles', 10, 100),
(4, 1, 'Burpees', 'reps', 25, 250),
-- Light & Circadian
(5, 2, 'Morning Light Exposure', 'minutes', 10, 60),
(6, 2, 'Sunrise Viewing', 'days', 7, 30),
-- Nutrition
(7, 3, 'Sugar-Free Days', 'days', 7, 30),
(8, 3, 'Ketogenic Days', 'days', 14, 90),
-- Sleep
(9, 4, 'Early Bedtime', 'days', 7, 30),
(10, 4, 'Quality Sleep Hours', 'hours', 50, 200),
-- Resilience
(11, 5, 'Meditation Minutes', 'minutes', 100, 1000),
(12, 5, 'Deep Breathing Sessions', 'sessions', 20, 200),
-- Meal Timing
(13, 6, 'Intermittent Fasting Days', 'days', 7, 30),
(14, 6, 'Early Dinner Days', 'days', 10, 30);

-- Insert default campaign if it doesn't exist
INSERT OR IGNORE INTO campaigns (id, title, description, status, admin_user_id) VALUES 
(1, 'Brain Fog Recovery Source - Metabolic Challenges', 'Turn your metabolic health challenges into funding for psychiatric recovery access through ketogenic and metabolic therapies.', 'active', 'system');
