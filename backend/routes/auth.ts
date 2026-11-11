import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { JWT_CONFIG } from '../config/constants';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    console.log('收到注册请求:', req.body);
    
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role: role || 'student',
    }).returning();

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role }, 
      JWT_CONFIG.SECRET || 'dev-secret', 
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token, user: { id: newUser.id, name: newUser.name, role: newUser.role } });
  } catch (error: any) {
    console.error('注册报错详情:', error);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(400).json({ success: false, message: '邮箱或密码错误' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ success: false, message: '邮箱或密码错误' });

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_CONFIG.SECRET || 'dev-secret', 
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET || 'dev-secret') as any;
    
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) return res.status(401).json({ success: false });

    res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (error) {
    res.status(401).json({ success: false });
  }
});

// 👇 必须有这一行！
export default router;