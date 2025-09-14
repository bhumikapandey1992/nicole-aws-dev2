
-- Create a temporary test user email mapping since we don't have users table in dev
CREATE TABLE IF NOT EXISTS temp_test_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL
);

INSERT OR REPLACE INTO temp_test_users (id, email) 
VALUES ('01987173-ebbc-7512-b6a9-35c5fbbbad69', 'nonprofit@mentalhealthketo.com');
