import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAI } from '@/lib/deepseek';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      name,
      personalityType,
      riskLevel,
      specialization,
      avatarUrl,
      avatarIpfsHash,
      trainingData
    } = await request.json();

    console.log('🎭 接收到AI创建请求:', {
      walletAddress,
      name,
      personalityType,
      riskLevel,
      specialization,
      avatarUrl: avatarUrl ? '已提供' : '未提供',
      trainingDataLength: trainingData ? trainingData.length : 0
    });

    if (!walletAddress || !name || !personalityType || !riskLevel || !avatarUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 1. 创建或获取用户（真实入库）
    console.log('👤 创建/获取用户...');
    let user = await Database.getUserByWallet(walletAddress);
    if (!user) {
      user = await Database.createUser(walletAddress);
    }

    // 2. 使用DeepSeek生成AI描述
    console.log('🤖 生成AI描述...');
    const deepseek = new DeepSeekAI();
    const description = await deepseek.generatePersonaDescription(
      personalityType,
      riskLevel,
      specialization,
      name,
      trainingData
    );

    // 3. 创建AI角色（真实入库）
    console.log('🎨 创建AI角色...');
    const aiPersona = await Database.createAIPersona({
      creator_id: user.id,
      name,
      personality_type: personalityType,
      risk_level: riskLevel,
      specialization,
      description,
      avatar_url: avatarUrl,
      avatar_ipfs_hash: avatarIpfsHash,
      training_data: trainingData,
    });

    // 4. 处理训练数据 - 存储到训练会话表中
    if (trainingData && Array.isArray(trainingData)) {
      console.log('🧠 处理训练数据...');

      // 将训练对话存储到ai_training_sessions表中
      for (let i = 0; i < trainingData.length; i += 2) {
        const userMessage = trainingData[i];
        const aiMessage = trainingData[i + 1];

        if (userMessage && aiMessage &&
            userMessage.role === 'user' &&
            aiMessage.role === 'assistant') {

          await Database.addTrainingSession(
            aiPersona.id,
            userMessage.content,
            aiMessage.content,
            'initial_training'
          );
        }
      }

      console.log('✅ 训练数据处理完成，共', Math.floor(trainingData.length / 2), '条对话记录');
    }

    return NextResponse.json({
      success: true,
      persona: aiPersona,
      message: 'AI角色创建成功！',
      needsNFTMinting: true
    });

  } catch (error) {
    console.error('❌ AI创建错误:', error);
    return NextResponse.json(
      { success: false, error: 'AI创建失败，请重试' },
      { status: 500 }
    );
  }
}
