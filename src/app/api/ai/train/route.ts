import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAI } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { personalityType, riskLevel, userMessage, previousMessages } = await request.json();

    if (!personalityType || !riskLevel || !userMessage) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const deepseek = new DeepSeekAI();
    
    // 转换之前的消息格式
    const previousSessions = previousMessages
      ?.filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
      ?.map((msg: any) => ({
        user_message: msg.role === 'user' ? msg.content : '',
        ai_response: msg.role === 'assistant' ? msg.content : ''
      }))
      ?.filter((session: any) => session.user_message && session.ai_response);

    const response = await deepseek.trainPersonality(
      personalityType,
      riskLevel,
      userMessage,
      previousSessions
    );

    return NextResponse.json({
      success: true,
      response: response
    });

  } catch (error) {
    console.error('AI训练错误:', error);
    return NextResponse.json(
      { success: false, error: 'AI训练失败，请重试' },
      { status: 500 }
    );
  }
}
