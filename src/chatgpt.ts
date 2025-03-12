import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ChatGPTClient {
  private context: ChatMessage[] = [];

  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.context.push({
        role: 'system',
        content: systemPrompt
      });
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // 사용자 메시지를 컨텍스트에 추가
      this.context.push({
        role: 'user',
        content: message
      });

      // API 요청
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: this.context,
        temperature: 0.7,
        max_tokens: 1000
      });

      const reply = response.choices[0]?.message?.content || '응답을 받지 못했습니다.';

      // 어시스턴트 응답을 컨텍스트에 추가
      this.context.push({
        role: 'assistant',
        content: reply
      });

      return reply;
    } catch (error) {
      console.error('ChatGPT API 오류:', error);
      throw error;
    }
  }

  // 컨텍스트 초기화
  clearContext() {
    this.context = this.context.filter(msg => msg.role === 'system');
  }

  // 현재 컨텍스트 반환
  getContext(): ChatMessage[] {
    return [...this.context];
  }
}

// 유틸리티 함수들
export const chatUtils = {
  // 단일 메시지 전송 (컨텍스트 없이)
  async sendSingleMessage(message: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0]?.message?.content || '응답을 받지 못했습니다.';
    } catch (error) {
      console.error('ChatGPT API 오류:', error);
      throw error;
    }
  },

  // 시스템 프롬프트와 함께 메시지 전송 (이미지 포함)
  async sendMessageWithSystem(
    message: string,
    systemPrompt: string,
    imageBase64?: string
  ): Promise<string> {
    try {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      // 이미지가 있는 경우 이미지 메시지 추가
      if (imageBase64) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        });
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0]?.message?.content || '응답을 받지 못했습니다.';
    } catch (error) {
      console.error('ChatGPT API 오류:', error);
      throw error;
    }
  }
};
