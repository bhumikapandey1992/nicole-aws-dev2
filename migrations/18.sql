
-- First, let's consolidate the categories by updating the existing ones and deleting duplicates

-- 1. Update Light & Circadian category to include Sun Exposure
UPDATE challenge_categories 
SET name = 'Light & Circadian', 
    description = 'Natural light exposure, circadian rhythm regulation, and sun exposure to support vitamin D synthesis and mental wellness',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- 2. Update Low Carb/Keto to be the combined nutrition category
UPDATE challenge_categories 
SET name = 'Low Carb & Ketogenic', 
    description = 'Ketogenic nutrition, low-carb eating, and metabolic dietary interventions to support brain health',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- 3. Update Meal Timing to include fasting
UPDATE challenge_categories 
SET name = 'Meal Timing & Fasting', 
    description = 'Intermittent fasting, time-restricted eating, and meal timing strategies for metabolic flexibility',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 6;

-- Now move challenge types to the correct consolidated categories

-- Move Sun Exposure related challenge types from category 12 to Light & Circadian (category 2)
-- Note: Looking at the data, Sun Exposure challenge types seem to be incorrectly in category 6, let's move them
UPDATE challenge_types SET category_id = 2, updated_at = CURRENT_TIMESTAMP 
WHERE name IN ('Outdoor Days', 'Sun Exposure Sessions', 'Sunlight Minutes') AND category_id = 6;

-- Move Ketogenic related challenge types from wrong categories to Low Carb & Ketogenic (category 3)
-- Move the Keto items that are incorrectly in Sleep Recovery category
UPDATE challenge_types SET category_id = 3, updated_at = CURRENT_TIMESTAMP 
WHERE name IN ('Keto Days', 'Ketosis Days', 'Low-Carb Meals') AND category_id = 4;

-- Move Fasting related challenge types from Low Carb/Keto to Meal Timing & Fasting (category 6)
UPDATE challenge_types SET category_id = 6, updated_at = CURRENT_TIMESTAMP 
WHERE name IN ('16:8 Fasting Days', 'Fasting Days', 'Fasting Hours') AND category_id = 3;

-- Clean up duplicate Exercise & Movement categories - merge challenge types into the first one
UPDATE challenge_types SET category_id = 1, updated_at = CURRENT_TIMESTAMP 
WHERE category_id = 8;

-- Move Cold Exposure challenge types from Exercise category to a more appropriate category (Resilience Building)
UPDATE challenge_types SET category_id = 5, updated_at = CURRENT_TIMESTAMP 
WHERE name IN ('Ice Bath Sessions', 'Cold Shower Minutes', 'Cold Plunge Days') AND category_id = 1;

-- Delete the duplicate and now-empty categories
DELETE FROM challenge_categories WHERE id IN (8, 9, 10, 12);
