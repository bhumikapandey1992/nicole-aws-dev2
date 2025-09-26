INSERT OR IGNORE INTO users (id, email, name) VALUES (1, 'dev@example.com', 'Dev User');

INSERT OR IGNORE INTO challenge_categories (id, name) VALUES
  (1, 'Endurance');

INSERT OR IGNORE INTO challenge_types (id, name, unit, category_id, suggested_min, suggested_max, is_custom)
VALUES
  (1, 'Running', 'miles', 1, 1, 50, 0);

INSERT INTO campaigns (id, title, description, status, start_date, end_date, every_org_url, admin_user_id, created_at)
VALUES
    (1, 'Fall Fundraiser', 'Let’s raise funds via metabolic challenges.', 'active',
     DATE('now','-7 days'), DATE('now','+21 days'),
     'https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card',
     1, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO NOTHING;

INSERT INTO participants (id, campaign_id, user_id, challenge_type_id, goal_amount, current_progress,
                          participant_name, bio, is_active, is_featured, created_at, updated_at)
VALUES
    (1, 1, 1, 1, 12, 3, 'User', 'Running for recovery!', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO NOTHING;

INSERT INTO participant_images (participant_id, filename, data_url, original_name, file_size, content_type, created_at)
VALUES (
           1,
           'banner-1x1.png',
           'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
           'banner-1x1.png',
           95,
           'image/png',
           CURRENT_TIMESTAMP
       );

INSERT INTO donors (id, participant_id, name, email, created_at)
VALUES (1, 1, 'Alice', 'alice@example.com', CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO NOTHING;

INSERT INTO pledges (id, donor_id, pledge_type, amount_per_unit)
VALUES (1, 1, 'per_unit_uncapped', 5.00)
    ON CONFLICT(id) DO NOTHING;

INSERT INTO participant_posts (participant_id, content, post_type, created_at)
VALUES (1, 'Week 1 done — 3 miles!', 'progress_update', CURRENT_TIMESTAMP);
