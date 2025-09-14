
-- Update existing participants without names to have identifiable names
UPDATE participants 
SET participant_name = 'Challenger #' || id 
WHERE participant_name IS NULL OR participant_name = '';
