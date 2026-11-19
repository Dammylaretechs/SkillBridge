# SkillBridge

SkillBridge is a responsive skills-to-opportunities platform. This version uses Render PostgreSQL as its source of truth for accounts, user skills, opportunities and learning resources. Search runs against the SkillBridge database; no external search API key is used.

## Deploy on Render

1. Push the contents of this folder to the root of a private GitHub repository. Keep `render.yaml` at the repository root.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Review the Blueprint resources: a Free Node.js Web Service named `skillbridge` and a Free PostgreSQL database named `skillbridge-db`.
4. Apply the Blueprint. Render supplies `DATABASE_URL` from the database connection string and generates `SESSION_SECRET`.
5. Render runs `npm install` and `npm start`. On startup, SkillBridge creates its tables and indexes automatically.

The Blueprint uses Render's Free plans for testing. Render Free web services sleep after inactivity, and Free PostgreSQL databases expire after 30 days. Export important database data before expiry or upgrade the database to a paid plan.

Do not commit `.env` or database credentials. `.env.example` contains placeholders only.

## PostgreSQL and pgAdmin

Use the Render database's **External Database URL** in pgAdmin 4 when connecting from your own computer. Set SSL mode to `Require`. The SkillBridge web service should use the **Internal Database URL** in its `DATABASE_URL` environment variable.

Tables created automatically:
- `users`: account details and password hashes (passwords are never stored in plain text).
- `user_sessions`: server-side login sessions.
- `skills`: skills attached to registered users.
- `opportunities`: opportunity listings managed in PostgreSQL.
- `courses`: learning resources managed in PostgreSQL.

## Add opportunities using pgAdmin

Open Query Tool on the `skillbridge` database and run:

```sql
INSERT INTO opportunities
(title, organization, category, location, work_mode, level, pay_type, deadline, url, description, source)
VALUES
('Junior Web Developer', 'Example Organisation', 'Jobs', 'Lagos, Nigeria', 'Hybrid', 'Entry level', 'Paid', '2027-01-31', 'https://example.com/apply', 'An example listing. Replace with a verified opportunity.', 'Example Organisation');
```

## Add learning resources using pgAdmin

```sql
INSERT INTO courses (title, platform, subject, level, url, description, is_free)
VALUES
('Responsive Web Design', 'freeCodeCamp', 'Web Development', 'Beginner', 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', 'Learn the fundamentals of responsive web design.', TRUE);
```

Replace example records with real listings and verify the original source, eligibility, deadlines, fees and availability before publishing. Set `is_active = FALSE` to hide a listing without deleting it.

## API endpoints

- `GET /api/health` — service and database health.
- `POST /api/auth/register` — create account.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — restore current session.
- `POST /api/auth/logout` — sign out.
- `PUT /api/profile` — update profile.
- `POST /api/skills` and `DELETE /api/skills/:id` — manage personal skills.
- `POST /api/search` — search database opportunities or courses.
- `GET /api/opportunities` and `GET /api/courses` — list active records.

## Notes

- Search results are only the records stored in SkillBridge PostgreSQL. The database does not automatically discover new internet listings.
- User passwords are hashed with bcrypt. Sessions are stored in PostgreSQL.
- Profile photos are currently stored as image data in the user record. For a large production deployment, move photos to object storage.
