-- USERS
CREATE TABLE IF NOT EXISTS users (
                                     id TEXT PRIMARY KEY,
                                     email TEXT,
                                     name TEXT,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         title TEXT NOT NULL,
                                         description TEXT,
                                         status TEXT NOT NULL DEFAULT 'active',
                                         start_date DATETIME,
                                         end_date DATETIME,
                                         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CHALLENGE CATEGORIES / TYPES
CREATE TABLE IF NOT EXISTS challenge_categories (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS challenge_types (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               category_id INTEGER NOT NULL,
                                               name TEXT NOT NULL,
                                               unit TEXT NOT NULL,
                                               suggested_min INTEGER,
                                               suggested_max INTEGER,
                                               is_custom INTEGER NOT NULL DEFAULT 0,
                                               created_by_user_id TEXT,
                                               FOREIGN KEY (category_id) REFERENCES challenge_categories(id)
    );

-- PARTICIPANTS
CREATE TABLE IF NOT EXISTS participants (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            campaign_id INTEGER NOT NULL,
                                            user_id TEXT NOT NULL,
                                            challenge_type_id INTEGER NOT NULL,
                                            goal_amount INTEGER NOT NULL,
                                            current_progress INTEGER NOT NULL DEFAULT 0,
                                            bio TEXT,
                                            participant_name TEXT,
                                            custom_unit TEXT,
                                            custom_challenge_name TEXT,
                                            profile_image_url TEXT,
                                            is_active INTEGER NOT NULL DEFAULT 1,
                                            is_featured INTEGER NOT NULL DEFAULT 0,
                                            every_org_url TEXT,
                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_type_id) REFERENCES challenge_types(id)
    );

CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_campaign ON participants(campaign_id);

-- PROGRESS LOGS
CREATE TABLE IF NOT EXISTS progress_logs (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             participant_id INTEGER NOT NULL,
                                             units_completed INTEGER NOT NULL,
                                             log_date TEXT NOT NULL,
                                             notes TEXT,
                                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                             FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

CREATE INDEX IF NOT EXISTS idx_progress_participant ON progress_logs(participant_id);

-- POSTS
CREATE TABLE IF NOT EXISTS participant_posts (
                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 participant_id INTEGER NOT NULL,
                                                 content TEXT NOT NULL,
                                                 image_url TEXT,
                                                 post_type TEXT NOT NULL DEFAULT 'update',
                                                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

-- DONORS & PLEDGES
CREATE TABLE IF NOT EXISTS donors (
                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                      participant_id INTEGER NOT NULL,
                                      name TEXT NOT NULL,
                                      email TEXT NOT NULL,
                                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

CREATE TABLE IF NOT EXISTS pledges (
                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       donor_id INTEGER NOT NULL,
                                       pledge_type TEXT NOT NULL CHECK (pledge_type IN ('per_unit_uncapped','per_unit_capped','flat_rate')),
    amount_per_unit REAL,
    max_total_amount REAL,
    flat_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id)
    );

-- USER NOTIFICATION PREFS
CREATE TABLE IF NOT EXISTS user_notification_preferences (
                                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                             user_id TEXT NOT NULL UNIQUE,
                                                             email_challenge_reminders INTEGER NOT NULL DEFAULT 0,
                                                             email_donor_updates INTEGER NOT NULL DEFAULT 0,
                                                             last_banner_dismissed DATETIME,
                                                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                             FOREIGN KEY (user_id) REFERENCES users(id)
    );

-- PARTICIPANT IMAGES
CREATE TABLE IF NOT EXISTS participant_images (
                                                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                  participant_id INTEGER NOT NULL,
                                                  url TEXT NOT NULL,
                                                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                  FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

-- FOLLOWS (for your new Follow feature)
CREATE TABLE IF NOT EXISTS follows (
                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       user_id TEXT NOT NULL,
                                       participant_id INTEGER NOT NULL,
                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                       UNIQUE(user_id, participant_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_posts_participant ON participant_posts(participant_id);
CREATE INDEX IF NOT EXISTS idx_donors_participant ON donors(participant_id);
CREATE INDEX IF NOT EXISTS idx_pledges_donor ON pledges(donor_id);
-- Migration number: 0048 	 2025-10-17T17:44:23.599Z
