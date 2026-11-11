import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, notifications } from '../db/schema';
import { JWT_CONFIG } from '../config/constants';

const router = Router();

const authMiddleware = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false });
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

// 获取我的未读通知
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const list = await db.select().from(notifications).where(eq(notifications.userId, user.id));
    // 过滤出未读的
    const unread = list.filter(n => !n.isRead);
    res.json({ success: true, data: unread });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 标记全部为已读
router.post('/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const list = await db.select().from(notifications).where(eq(notifications.userId, user.id));
    for (const n of list) {
      if (!n.isRead) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, n.id));
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;