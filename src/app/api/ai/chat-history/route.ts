import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('personaId');

    if (!personaId) {
      return NextResponse.json(
        { success: false, error: 'Missing personaId parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 获取聊天历史记录 - Persona ID:', personaId);

    // 从数据库获取训练会话记录（包括consultation类型）
    const sessions = await Database.getTrainingSessionsByPersona(parseInt(personaId));

    console.log('📚 获取到', sessions.length, '条历史记录');

    // 将训练会话转换为聊天消息格式
    const messages = sessions.flatMap(session => [
      {
        id: `user-${session.id}`,
        role: 'user' as const,
        content: session.user_message,
        timestamp: session.created_at,
        sessionId: session.id
      },
      {
        id: `assistant-${session.id}`,
        role: 'assistant' as const,
        content: session.ai_response,
        timestamp: session.created_at,
        sessionId: session.id,
        hasMarketData: session.session_type === 'consultation'
      }
    ]);

    return NextResponse.json({
      success: true,
      messages: messages,
      totalSessions: sessions.length
    });

  } catch (error) {
    console.error('❌ 获取聊天历史记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取聊天历史记录失败，请重试' },
      { status: 500 }
    );
  }
}