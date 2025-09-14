
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER,
  participant_id INTEGER,
  subscription_endpoint TEXT NOT NULL,
  subscription_keys TEXT NOT NULL,
  subscription_type TEXT DEFAULT 'donor_updates',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
