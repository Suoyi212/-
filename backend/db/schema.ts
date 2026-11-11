import {
  sqliteTable,
  integer,
  text,
} from 'drizzle-orm/sqlite-core';

// ============ 1. users 用户表 ============
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  // 'student' | 'teacher' (区分学生和老师)
  role: text('role').notNull().default('student'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============ 2. courses 课程表 ============
export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // 课程代码 (如 CS301)
  name: text('name').notNull(),
  credits: text('credits').notNull(), // 学分
  prerequisite: text('prerequisite'),
  capacity: integer('capacity').notNull().default(0),
  enrolled: integer('enrolled').notNull().default(0),
  description: text('description'),
  // 'published' 上架 | 'unpublished' 下架 (老师控制)
  status: text('status').notNull().default('published'),
  teacherId: integer('teacher_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============ 3. questions 提问表 ============
export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id), // 学生ID
  courseId: integer('course_id').notNull().references(() => courses.id), // 课程ID
  question: text('question').notNull(),
  // 'ai' | 'teacher' (提问时选择的：让AI答还是让老师答)
  answerMode: text('answer_mode').notNull().default('ai'),
  // 'pending' 待处理 | 'ai_answered' AI已答 | 'teacher_pending' 待老师答 | 'teacher_answered' 老师已答
  status: text('status').notNull().default('pending'),
  answer: text('answer'),
  answeredById: integer('answered_by_id').references(() => users.id), // 回答者的ID
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  answeredAt: integer('answered_at', { mode: 'timestamp' }),
});

// ============ 4. notifications 通知表 ============
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id), // 接收通知的人
  type: text('type').notNull(), // 通知类型
  questionId: integer('question_id').references(() => questions.id),
  message: text('message').notNull(), // 通知内容
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false), // 是否已读
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});