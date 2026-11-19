-- Run these examples in pgAdmin Query Tool after SkillBridge has been deployed
-- and its automatic startup migration has created the tables.
-- Replace all example details and URLs with verified, real listings before use.

-- Add an opportunity
-- INSERT INTO opportunities
-- (title, organization, category, location, work_mode, level, pay_type, deadline, url, description, source)
-- VALUES
-- ('Opportunity title', 'Organization', 'Internships', 'Lagos, Nigeria', 'Hybrid', 'Student', 'Paid',
--  '2027-03-31', 'https://official-site.example/apply', 'Verified opportunity description.', 'Organization');

-- Add a learning resource
-- INSERT INTO courses (title, platform, subject, level, url, description, is_free)
-- VALUES
-- ('Course title', 'freeCodeCamp', 'Web Development', 'Beginner',
--  'https://www.freecodecamp.org/', 'Course description.', TRUE);

-- View active opportunities
-- SELECT id, title, organization, category, location, deadline, url
-- FROM opportunities WHERE is_active = TRUE ORDER BY deadline NULLS LAST;

-- View active courses
-- SELECT id, title, platform, subject, level, url
-- FROM courses WHERE is_active = TRUE ORDER BY title;

-- Hide a listing without deleting it
-- UPDATE opportunities SET is_active = FALSE WHERE id = 1;
-- UPDATE courses SET is_active = FALSE WHERE id = 1;
