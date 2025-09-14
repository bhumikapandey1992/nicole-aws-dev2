
-- Revert participant names back to NULL
UPDATE participants 
SET participant_name = NULL 
WHERE participant_name LIKE 'Challenger #%';
