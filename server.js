const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production.');
if (isProduction && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  name: 'skillbridge.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
// Serve only browser-facing assets. Do not expose server.js, package.json,
// README files, SQL examples, or other project files over HTTP.
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  goal VARCHAR(160) DEFAULT 'Explore career options',
  location VARCHAR(160) DEFAULT '',
  interest VARCHAR(160) DEFAULT 'Still exploring',
  bio TEXT DEFAULT '',
  profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS skills (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  level VARCHAR(40) NOT NULL DEFAULT 'Beginner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);
CREATE TABLE IF NOT EXISTS opportunities (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  organization VARCHAR(180) DEFAULT '',
  category VARCHAR(80) NOT NULL DEFAULT 'Other',
  location VARCHAR(160) DEFAULT '',
  work_mode VARCHAR(60) DEFAULT '',
  level VARCHAR(80) DEFAULT '',
  pay_type VARCHAR(60) DEFAULT '',
  deadline DATE,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  source VARCHAR(180) DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT opportunities_url_http CHECK (url ~* '^https?://')
);
CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  platform VARCHAR(100) NOT NULL,
  subject VARCHAR(120) DEFAULT '',
  level VARCHAR(60) DEFAULT '',
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_free BOOLEAN,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courses_url_http CHECK (url ~* '^https?://')
);
CREATE INDEX IF NOT EXISTS opportunities_search_idx ON opportunities USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(organization,'') || ' ' || coalesce(category,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS courses_search_idx ON courses USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(platform,'') || ' ' || coalesce(subject,'') || ' ' || coalesce(description,'')));
CREATE INDEX IF NOT EXISTS skills_user_idx ON skills(user_id);
`;

function clean(value, max = 500) { return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max); }
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, goal: user.goal, location: user.location,
    interest: user.interest, bio: user.bio, profileImage: user.profile_image || null,
    skills: user.skills || [], createdAt: user.created_at };
}
async function loadUser(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!result.rowCount) return null;
  const user = result.rows[0];
  const skills = await pool.query('SELECT id, name, level FROM skills WHERE user_id = $1 ORDER BY created_at, id', [id]);
  user.skills = skills.rows;
  return user;
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected', search: 'postgresql' }); }
  catch (error) { console.error('Health check database error:', error.message); res.status(503).json({ status: 'error', database: 'unavailable' }); }
});

app.post('/api/auth/register', async (req, res) => {
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = String(req.body?.password || '');
  const goal = clean(req.body?.goal, 160) || 'Explore career options';
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
    return res.status(400).json({ error: 'Enter your name, a valid email and a password of at least 8 characters.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const inserted = await pool.query(
      'INSERT INTO users (name,email,password_hash,goal) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email, hash, goal]);
    req.session.userId = inserted.rows[0].id;
    const user = await loadUser(req.session.userId);
    req.session.save(err => err ? res.status(500).json({ error: 'Account created, but the session could not be started. Please log in.' }) : res.status(201).json({ user: publicUser(user) }));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    console.error('Registration error:', error.message); res.status(500).json({ error: 'Unable to create your account right now.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = String(req.body?.password || '');
  try {
    const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash)))
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    req.session.userId = result.rows[0].id;
    const user = await loadUser(req.session.userId);
    req.session.save(err => err ? res.status(500).json({ error: 'Unable to start your session. Please try again.' }) : res.json({ user: publicUser(user) }));
  } catch (error) { console.error('Login error:', error.message); res.status(500).json({ error: 'Unable to log in right now.' }); }
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) return res.status(200).json({ user: null });
  try {
    const user = await loadUser(req.session.userId);
    if (!user) { req.session.destroy(() => {}); return res.json({ user: null }); }
    res.json({ user: publicUser(user) });
  } catch (error) { console.error('Session lookup error:', error.message); res.status(500).json({ error: 'Unable to load your account.' }); }
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(error => {
  if (error) return res.status(500).json({ error: 'Unable to log out cleanly.' });
  res.clearCookie('skillbridge.sid', { httpOnly: true, secure: isProduction, sameSite: 'lax' });
  res.json({ success: true });
}));

app.put('/api/profile', requireAuth, async (req, res) => {
  const name = clean(req.body?.name, 120);
  if (name.length < 2) return res.status(400).json({ error: 'Enter a valid name.' });
  try {
    await pool.query(`UPDATE users SET name=$1, location=$2, interest=$3, bio=$4, profile_image=$5, updated_at=NOW() WHERE id=$6`,
      [name, clean(req.body?.location,160), clean(req.body?.interest,160), clean(req.body?.bio,2000), req.body?.profileImage || null, req.session.userId]);
    res.json({ user: publicUser(await loadUser(req.session.userId)) });
  } catch (error) { console.error('Profile update error:', error.message); res.status(500).json({ error: 'Unable to save your profile.' }); }
});

app.post('/api/skills', requireAuth, async (req, res) => {
  const name = clean(req.body?.name, 120); const level = clean(req.body?.level, 40) || 'Beginner';
  if (!name) return res.status(400).json({ error: 'Enter a skill name.' });
  try {
    const result = await pool.query('INSERT INTO skills (user_id,name,level) VALUES ($1,$2,$3) ON CONFLICT (user_id,name) DO NOTHING RETURNING id,name,level', [req.session.userId,name,level]);
    if (!result.rowCount) return res.status(409).json({ error: 'That skill is already in your profile.' });
    res.status(201).json({ skill: result.rows[0] });
  } catch (error) { console.error('Add skill error:', error.message); res.status(500).json({ error: 'Unable to add this skill.' }); }
});
app.delete('/api/skills/:id', requireAuth, async (req, res) => {
  try { await pool.query('DELETE FROM skills WHERE id=$1 AND user_id=$2', [req.params.id,req.session.userId]); res.json({ success: true }); }
  catch (error) { console.error('Delete skill error:', error.message); res.status(500).json({ error: 'Unable to remove this skill.' }); }
});

app.post('/api/search', async (req, res) => {
  const kind = req.body?.kind === 'courses' ? 'courses' : 'opportunities';
  const query = clean(req.body?.query, 180);
  const filters = req.body?.filters && typeof req.body.filters === 'object' ? req.body.filters : {};
  const term = `%${query}%`;
  try {
    let result;
    if (kind === 'courses') {
      const platform = clean(filters.platform, 100);
      const level = clean(filters.level, 60);
      result = await pool.query(`SELECT id,title,platform AS source,url,description,subject,level,is_free FROM courses
        WHERE is_active=TRUE AND ($1='' OR title ILIKE $2 OR subject ILIKE $2 OR description ILIKE $2 OR platform ILIKE $2)
        AND ($3='' OR platform ILIKE $4) AND ($5='' OR level ILIKE $6)
        ORDER BY updated_at DESC, title ASC LIMIT 100`, [query,term,platform,`%${platform}%`,level,`%${level}%`]);
    } else {
      const category = clean(filters.type,80); const location = clean(filters.location,160);
      const mode = clean(filters.mode,60); const level = clean(filters.level,80); const pay = clean(filters.pay,60);
      result = await pool.query(`SELECT id,title,organization,category,location,work_mode,level,pay_type,deadline,url,description,
        COALESCE(NULLIF(source,''),organization,'SkillBridge listing') AS source FROM opportunities
        WHERE is_active=TRUE AND ($1='' OR title ILIKE $2 OR organization ILIKE $2 OR category ILIKE $2 OR description ILIKE $2)
        AND ($3='' OR category ILIKE $4) AND ($5='' OR location ILIKE $6) AND ($7='' OR work_mode ILIKE $8)
        AND ($9='' OR level ILIKE $10) AND ($11='' OR pay_type ILIKE $12)
        ORDER BY deadline ASC NULLS LAST, updated_at DESC LIMIT 100`,
        [query,term,category,`%${category}%`,location,`%${location}%`,mode,`%${mode}%`,level,`%${level}%`,pay,`%${pay}%`]);
    }
    res.set('Cache-Control','no-store');
    res.json({ kind, query, results: result.rows.map(row => ({ ...row, id: String(row.id) })), updatedAt: new Date().toISOString(), source: 'SkillBridge database' });
  } catch (error) { console.error('Database search error:', error.message); res.status(500).json({ error: 'Database search failed. Please try again.' }); }
});

app.get('/api/opportunities', async (_req,res) => {
  try { const result = await pool.query('SELECT id,title,organization,category,location,work_mode,level,pay_type,deadline,url,description,source FROM opportunities WHERE is_active=TRUE ORDER BY deadline ASC NULLS LAST LIMIT 100'); res.json({ results: result.rows }); }
  catch (error) { console.error(error.message); res.status(500).json({ error: 'Unable to load opportunities.' }); }
});
app.get('/api/courses', async (_req,res) => {
  try { const result = await pool.query('SELECT id,title,platform,subject,level,url,description,is_free FROM courses WHERE is_active=TRUE ORDER BY updated_at DESC LIMIT 100'); res.json({ results: result.rows }); }
  catch (error) { console.error(error.message); res.status(500).json({ error: 'Unable to load courses.' }); }
});

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function start() {
  await pool.query(schema);
  app.listen(PORT, () => console.log(`SkillBridge running on port ${PORT}; PostgreSQL connected.`));
}
start().catch(error => { console.error('SkillBridge startup failed:', error); process.exit(1); });
