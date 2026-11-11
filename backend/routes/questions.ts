import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { questions, users, courses, notifications } from '../db/schema';
import { JWT_CONFIG } from '../config/constants';

const router = Router();

const authMiddleware = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET || 'dev-secret') as any;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) return res.status(401).json({ success: false });
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false });
  }
};

// 学生提交问题
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { courseId, question, answerMode } = req.body;
    const [course] = await db.select().from(courses).where(eq(courses.code, courseId));
    if (!course) return res.status(404).json({ success: false, message: '课程不存在' });

    const [newQuestion] = await db.insert(questions).values({
      userId: user.id,
      courseId: course.id,
      question,
      answerMode,
      status: answerMode === 'ai' ? 'ai_answered' : 'teacher_pending',
      createdAt: new Date(),
    }).returning();

    if (answerMode === 'teacher' && course.teacherId) {
      await db.insert(notifications).values({
        userId: course.teacherId,
        type: 'new_question',
        questionId: newQuestion.id,
        message: `学生 ${user.name} 在课程 ${course.name} 提交了一个新问题。`,
        createdAt: new Date(),
      });
    }
    res.json({ success: true, data: newQuestion });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 学生获取自己的提问
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const list = await db.select().from(questions).where(eq(questions.userId, user.id));
    const allUsers = await db.select().from(users);
    const enrichedList = list.map(q => {
      let answererName = null;
      if (q.answeredById) {
        const teacher = allUsers.find(u => u.id === q.answeredById);
        if (teacher) answererName = teacher.name;
      }
      return { ...q, answererName };
    });
    res.json({ success: true, data: enrichedList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 老师获取待回复问题
router.get('/teacher/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'teacher') return res.status(403).json({ success: false });
    const allCourses = await db.select().from(courses);
    const myCourseIds = allCourses.filter(c => c.teacherId === user.id).map(c => c.id);
    if (myCourseIds.length === 0) return res.json({ success: true, data: [] });

    const allQuestions = await db.select().from(questions);
    const allUsers = await db.select().from(users);
    const pendingList = [];

    for (const q of allQuestions) {
      if (myCourseIds.includes(q.courseId) && q.status === 'teacher_pending') {
        const student = allUsers.find(u => u.id === q.userId);
        const course = allCourses.find(c => c.id === q.courseId);
        pendingList.push({
          ...q,
          studentName: student ? student.name : '未知学生',
          courseName: course ? course.name : '未知课程'
        });
      }
    }
    res.json({ success: true, data: pendingList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👇 新增：老师获取已回复问题
router.get('/teacher/answered', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'teacher') return res.status(403).json({ success: false });
    const allCourses = await db.select().from(courses);
    const myCourseIds = allCourses.filter(c => c.teacherId === user.id).map(c => c.id);
    if (myCourseIds.length === 0) return res.json({ success: true, data: [] });

    const allQuestions = await db.select().from(questions);
    const allUsers = await db.select().from(users);
    const answeredList = [];

    for (const q of allQuestions) {
      if (myCourseIds.includes(q.courseId) && q.status === 'teacher_answered') {
        const student = allUsers.find(u => u.id === q.userId);
        const course = allCourses.find(c => c.id === q.courseId);
        answeredList.push({
          ...q,
          studentName: student ? student.name : '未知学生',
          courseName: course ? course.name : '未知课程'
        });
      }
    }
    res.json({ success: true, data: answeredList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 老师回复问题
router.post('/:id/reply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'teacher') return res.status(403).json({ success: false });
    
    const questionId = parseInt(req.params.id as string);
    const { answer } = req.body;

    await db.update(questions).set({
      answer,
      status: 'teacher_answered',
      answeredById: user.id,
      answeredAt: new Date(),
    }).where(eq(questions.id, questionId));

    const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
    if (q) {
      await db.insert(notifications).values({
        userId: q.userId,
        type: 'teacher_replied',
        questionId: q.id,
        message: `你的提问已被老师回复。`,
        createdAt: new Date(),
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;