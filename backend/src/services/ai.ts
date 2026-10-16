import { GoogleGenAI } from '@google/genai';

const aiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function generateChatResponse(message: string): Promise<string> {
  if (!aiClient) {
    throw new Error('AI service is not configured');
  }

  if (!message || typeof message !== 'string' || message.length > 100000) {
    throw new Error('Message is required and must be under 2000 characters');
  }

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message
    });
    return response.text || '';
  } catch (error: any) {
    console.error('AI chat error:', error.message);
    throw new Error('AI service error');
  }
}
