import Database from 'better-sqlite3'
import { config } from './config.js'

export const db = new Database(config.dbFile)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student','instructor','admin')),
  bio           TEXT    NOT NULL DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  summary     TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  level       TEXT    NOT NULL DEFAULT 'Beginner-friendly',
  schedule    TEXT    NOT NULL DEFAULT '',
  seats       INTEGER NOT NULL DEFAULT 20,
  price_cents INTEGER NOT NULL DEFAULT 0,
  accent      TEXT    NOT NULL DEFAULT '#b8ff3d',
  status      TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  course_id      INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  filename       TEXT    NOT NULL,
  original_name  TEXT    NOT NULL DEFAULT '',
  mime_type      TEXT    NOT NULL DEFAULT 'video/mp4',
  size_bytes     INTEGER NOT NULL DEFAULT 0,
  duration       INTEGER NOT NULL DEFAULT 0,
  thumbnail      TEXT,
  visibility     TEXT    NOT NULL DEFAULT 'enrolled' CHECK (visibility IN ('public','enrolled','private')),
  position       INTEGER NOT NULL DEFAULT 0,
  uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS video_progress (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  seconds    INTEGER NOT NULL DEFAULT 0,
  completed  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'FULL-STACK',
  description TEXT    NOT NULL DEFAULT '',
  tags        TEXT    NOT NULL DEFAULT '[]',
  color       TEXT    NOT NULL DEFAULT '#b8ff3d',
  thumbnail   TEXT,
  demo_url    TEXT    NOT NULL DEFAULT '',
  report_url  TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mentorship_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT    NOT NULL,
  phone      TEXT    NOT NULL DEFAULT '',
  focus      TEXT    NOT NULL DEFAULT '',
  message    TEXT    NOT NULL DEFAULT '',
  status     TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_videos_course      ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user   ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_requests_status    ON mentorship_requests(status);
`)

// Keep existing local databases compatible with the current mentorship form.
try { db.exec("ALTER TABLE mentorship_requests ADD COLUMN phone TEXT NOT NULL DEFAULT ''") } catch (error) {
  if (!String(error.message).includes('duplicate column name')) throw error
}
try { db.exec("ALTER TABLE projects ADD COLUMN thumbnail TEXT") } catch (error) {
  if (!String(error.message).includes('duplicate column name')) throw error
}
try { db.exec("ALTER TABLE enrollments ADD COLUMN payment_verified INTEGER NOT NULL DEFAULT 0") } catch (error) {
  if (!String(error.message).includes('duplicate column name')) throw error
}

export const publicUser = row => row && {
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  bio: row.bio,
  status: row.status,
  createdAt: row.created_at
}
