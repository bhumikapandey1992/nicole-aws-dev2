-- 00xx_add_follows.sql
CREATE TABLE IF NOT EXISTS follows (
                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       user_id TEXT NOT NULL,
                                       participant_id INTEGER NOT NULL,
                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                       UNIQUE(user_id, participant_id)
    );
