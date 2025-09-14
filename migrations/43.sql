
-- Delete ALL challenge categories and challenge types to start fresh
DELETE FROM challenge_types;
DELETE FROM challenge_categories;

-- Insert exactly 7 challenge categories (no duplicates)
INSERT INTO challenge_categories (name, icon, description) VALUES
('Cold Exposure', 'snowflake', 'Ice baths, cold showers, and outdoor cold exposure to boost metabolic health and mental resilience'),
('Exercise & Movement', 'activity', 'Physical activity and structured exercise sessions to support metabolic function and mental clarity'),
('Intermittent Fasting', 'clock', 'Structured eating windows to promote metabolic flexibility and cognitive benefits'),
('Low Carb & Ketogenic', 'salad', 'Ketogenic nutrition, low-carb eating, and metabolic dietary interventions to support brain health'),
('Light & Circadian', 'sun', 'Natural light exposure, circadian rhythm regulation, and sun exposure to support vitamin D synthesis and mental wellness'),
('Meditation & Mindfulness', 'brain', 'Mindfulness practices that complement metabolic interventions for mental wellness'),
('Sleep Optimization', 'moon', 'Sleep hygiene, recovery protocols, and circadian health');
