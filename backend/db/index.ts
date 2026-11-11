import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

// 强制在根目录生成并连接 db.sqlite
const dbPath = path.resolve(process.cwd(), 'db.sqlite');
const sqlite = new Database(dbPath);

sqlite.pragma('foreign_keys = ON');

// 👇 核心杀招：启动时直接执行 SQL 语句建表！
// 如果表存在就忽略，不存在就直接创建
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    credits TEXT NOT NULL,
    prerequisite TEXT,
    capacity INTEGER NOT NULL DEFAULT 0,
    enrolled INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    teacher_id INTEGER REFERENCES users(id),
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    question TEXT NOT NULL,
    answer_mode TEXT NOT NULL DEFAULT 'ai',
    status TEXT NOT NULL DEFAULT 'pending',
    answer TEXT,
    answered_by_id INTEGER REFERENCES users(id),
    created_at INTEGER NOT NULL,
    answered_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    question_id INTEGER REFERENCES questions(id),
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });