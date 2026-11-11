import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { courses, users } from '../db/schema';
import { JWT_CONFIG } from '../config/constants';

const router = Router();

const authMiddleware = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET || 'dev-secret') as any;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) return res.status(401).json({ success: false, message: '用户不存在' });
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token 无效' });
  }
};

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role === 'teacher') {
      const myCourses = await db.select().from(courses).where(eq(courses.teacherId, user.id));
      return res.json({ success: true, data: myCourses });
    } else {
      const publishedCourses = await db.select().from(courses).where(eq(courses.status, 'published'));
      return res.json({ success: true, data: publishedCourses });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '获取课程失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'teacher') return res.status(403).json({ success: false, message: '只有老师能操作' });

    const { code, name, credits, prerequisite, capacity, description } = req.body;
    
    const existing = await db.select().from(courses).where(eq(courses.code, code));
    if (existing.length > 0) return res.status(400).json({ success: false, message: '课程代码已存在' });

    const [newCourse] = await db.insert(courses).values({
      code, name, credits, prerequisite, capacity: parseInt(capacity) || 0, description,
      teacherId: user.id,
      status: 'published'
    }).returning();

    res.json({ success: true, data: newCourse });
  } catch (error) {
    res.status(500).json({ success: false, message: '新增课程失败' });
  }
});

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'teacher') return res.status(403).json({ success: false, message: '只有老师能操作' });

    const courseId = parseInt(req.params.id as string); 
    const { status } = req.body;

    await db.update(courses).set({ status }).where(eq(courses.id, courseId));

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 👇 必须有这一行！
export default router;