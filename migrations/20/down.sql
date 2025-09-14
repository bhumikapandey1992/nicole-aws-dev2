
-- This would restore the duplicates, but since we're cleaning up a mistake, 
-- we'll just recreate the structure if needed
INSERT INTO challenge_categories (id, name, description, icon, created_at, updated_at) VALUES
(13, 'Cold Exposure', 'Cold exposure activities for metabolic health', '❄️', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(14, 'Light & Circadian', 'Light exposure and circadian rhythm regulation', '☀️', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(15, 'Low Carb & Ketogenic', 'Low-carb and ketogenic nutrition practices', '🥑', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(16, 'Meal Timing & Fasting', 'Meal timing and fasting protocols', '⏰', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(17, 'Meditation & Mindfulness', 'Meditation and mindfulness practices', '🧘', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(18, 'Physical Activity', 'Physical activity and exercise', '💪', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(19, 'Sleep Recovery', 'Sleep optimization and recovery', '😴', '2025-08-15 20:31:16', '2025-08-15 20:31:16'),
(20, 'Resilience Building and Self-Regulation', 'Resilience building and self-regulation practices', '🧠', '2025-08-15 20:31:16', '2025-08-15 20:31:16');

UPDATE challenge_categories SET name = 'Exercise & Movement', description = 'Metabolic Drive', icon = 'Activity' WHERE id = 1;
UPDATE challenge_categories SET name = 'Resilience Building', description = 'Resilience Building and Self-Regulation', icon = 'Heart' WHERE id = 5;
