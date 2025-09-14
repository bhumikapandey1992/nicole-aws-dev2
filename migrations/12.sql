
-- Ensure we have a default campaign for users to participate in
INSERT OR IGNORE INTO campaigns (id, title, description, status, admin_user_id) VALUES
(1, 'Brain Fog Recovery Source - Metabolic Challenges', 'Turn metabolic challenges into funds for psychiatric recovery support', 'active', 'system');
