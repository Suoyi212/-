import { Router, Request, Response } from 'express';
import { createAIService } from '../services/aiService';

const router = Router();

// Streaming chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, systemPrompt, courseContext } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const aiService = createAIService();
    const appLink =
      req.get('Referer') || req.get('Origin') || `${req.protocol}://${req.get('host')}`;

    const contextPrompt = courseContext
      ? `You are an academic course selection assistant for a Chinese university. The student is currently viewing course ${courseContext.code} (${courseContext.name}). Answer questions about course selection rules, prerequisites, credit requirements, and course content. Be concise, accurate, and helpful. Respond in Chinese.${systemPrompt ? '\n' + systemPrompt : ''}`
      : `You are an academic course selection assistant for a Chinese university. Answer questions about course selection rules, prerequisites, credit requirements, and course content. Be concise, accurate, and helpful. Respond in Chinese.${systemPrompt ? '\n' + systemPrompt : ''}`;

    // CRITICAL: brief async pause before SSE headers for Vercel streaming
    await new Promise((resolve) => setTimeout(resolve, 50));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

   for await (const chunk of aiService.chatDefault(message, contextPrompt, appLink)) {
  if (clientDisconnected || res.writableEnded) break;
  res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
} 

    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

export default router;
