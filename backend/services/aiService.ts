import axios from 'axios';
import FormData from 'form-data';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  appLink?: string;
}

interface SpeechToTextRequest {
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  appLink?: string;
}

interface SpeechToTextResponse {
  text: string;
}

interface SearchResult {
  text: string;
  score: number;
  fileId: string;
  fileName: string;
  metadata?: any;
  knowledgeBaseId?: string;
}

interface KnowledgeBaseConfig {
  id: string;
  weight: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

const DEFAULT_MODEL_NAME = 'Qwen/Qwen2.5-7B-Instruct';

class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OMNIFLOW_API_KEY;
    this.baseUrl = 'https://api.siliconflow.cn/v1';
  }

  /**
   * Make a non-streaming chat completion request
   */
  async chatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          ...request,
          stream: false,
          model: process.env.LLM_MODEL_NAME || DEFAULT_MODEL_NAME,
          appLink: request.appLink,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error(`AI service request failed: ${error}`);
    }
  }

  /**
   * Make a streaming chat completion request
   */
  async *chatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          ...request,
          stream: true,
          model: process.env.LLM_MODEL_NAME || DEFAULT_MODEL_NAME,
          appLink: request.appLink,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed: StreamingChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Service Streaming Error:', error);
      throw new Error(`AI service streaming request failed: ${error}`);
    }
  }

  /**
   * Simple chat method for basic conversations (non-streaming)
   */
  async chat(
    message: string,
    systemPrompt?: string,
    appLink?: string,
    topK?: number,
  ): Promise<string> {
    let enhancedSystemPrompt = systemPrompt;

    const messages: ChatMessage[] = [];

    if (enhancedSystemPrompt) {
      messages.push({ role: 'system', content: enhancedSystemPrompt });
    }

    messages.push({ role: 'user', content: message });

    const response = await this.chatCompletion({ messages, appLink });
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Default chat method that returns streaming response
   */
  async *chatDefault(
    message: string,
    systemPrompt?: string,
    appLink?: string,
    topK?: number,
  ): AsyncGenerator<string, void, unknown> {
    yield* this.chatStream(message, systemPrompt, appLink, topK);
  }

  /**
   * Chat with conversation history
   */
  async chatWithHistory(messages: ChatMessage[]): Promise<string> {
    const response = await this.chatCompletion({ messages });
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Streaming chat method
   */
  async *chatStream(
    message: string,
    systemPrompt?: string,
    appLink?: string,
    topK?: number,
  ): AsyncGenerator<string, void, unknown> {
    let enhancedSystemPrompt = systemPrompt;

    const messages: ChatMessage[] = [];

    if (enhancedSystemPrompt) {
      messages.push({ role: 'system', content: enhancedSystemPrompt });
    }

    messages.push({ role: 'user', content: message });

    yield* this.chatCompletionStream({ messages, appLink });
  }

  /**
   * Convert speech to text using Whisper API
   */
  async speechToText(
    audioFile: File | Buffer | Blob,
    options?: SpeechToTextRequest,
  ): Promise<string> {
    try {
      const formData = new FormData();

      if (audioFile instanceof File) {
        const arrayBuffer = await audioFile.arrayBuffer();
        formData.append('file', Buffer.from(arrayBuffer), audioFile.name);
      } else if (audioFile instanceof Buffer) {
        formData.append('file', audioFile, 'audio.mp3');
      } else if (audioFile instanceof Blob) {
        const buffer = await audioFile.arrayBuffer();
        formData.append('file', Buffer.from(buffer), 'audio.mp3');
      }

      if (options?.model) formData.append('model', options.model);
      if (options?.language) formData.append('language', options.language);
      if (options?.prompt) formData.append('prompt', options.prompt);
      if (options?.response_format)
        formData.append('response_format', options.response_format);
      if (options?.temperature !== undefined)
        formData.append('temperature', options.temperature.toString());
      if (options?.appLink) formData.append('appLink', options.appLink);

      const response = await axios.post(
        `${this.baseUrl}/audio/transcriptions`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...formData.getHeaders(),
          },
        },
      );

      return response.data.text;
    } catch (error) {
      console.error('Speech-to-text Error:', error);
      throw new Error(`Speech-to-text request failed: ${error}`);
    }
  }
}

export function createAIService(): AIService {
  return new AIService();
}

export default AIService;
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  SpeechToTextRequest,
  SpeechToTextResponse,
};