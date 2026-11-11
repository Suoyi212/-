import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import questionRoutes from './routes/questions';
import notificationRoutes from './routes/notifications'; // 引入通知路由
import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';

import { errorHandler } from './middleware/errorHandler';

const app = express();

// 允许跨域
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// 解析 JSON
app.use(express.json());

// 挂载 API 路由
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/notifications', notificationRoutes);

// 统一错误处理
app.use(errorHandler as ErrorRequestHandler);

// 启动服务
app.listen(3000, () => {
  console.log(`Server ready on port 3000`);
});

export default app;