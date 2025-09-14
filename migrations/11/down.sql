
-- Remove the sample challenge types we added
DELETE FROM challenge_types WHERE name IN (
  'Kettlebell Swings', 'Push-ups', 'Walking/Running', 'Burpees', 'Squats',
  'Morning Light Exposure', 'Sunrise Viewing', 'Evening Light Management',
  'Keto Days', 'Carb-Free Meals', 'Sugar-Free Days',
  'Early Bedtime', 'Sleep Quality Hours', 'Screen-Free Hours Before Bed',
  'Meditation Minutes', 'Cold Exposure', 'Breathing Exercises',
  'Intermittent Fasting Days', 'Time-Restricted Eating Hours'
);
