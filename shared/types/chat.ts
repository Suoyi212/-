export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  courseCode?: string;
  courseName?: string;
  feedback?: 'helpful' | 'unhelpful';
  escalated?: boolean;
}

export interface MyQuestion {
  id: string;
  question: string;
  courseCode: string;
  courseName: string;
  status: 'answered' | 'pending' | 'escalated';
  answer?: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  systemPrompt?: string;
  courseContext?: {
    code: string;
    name: string;
  };
}

export interface ChatResponse {
  success: boolean;
  data?: { message: string };
  error?: string;
}
