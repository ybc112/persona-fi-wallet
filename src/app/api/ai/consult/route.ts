import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';
import { DeepSeekAI } from '@/lib/deepseek';
import { AIPersonalizationService } from '@/lib/ai-personalization';
import { MarketDataAggregator } from '@/services/marketDataAggregator';

export async function POST(request: NextRequest) {
  try {
    const { personaId, userMessage, walletAddress, marketData } = await request.json();

    if (!personaId || !userMessage) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🤖 AI咨询请求:', { personaId, userMessage, hasMarketData: !!marketData });

    // 1. 获取AI角色信息
    const persona = await Database.getAIPersonaById(personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: 'AI角色不存在' },
        { status: 404 }
      );
    }

    // 2. 获取训练数据
    const trainingSessions = await Database.getTrainingSessionsByPersona(personaId);
    console.log('📚 获取训练数据:', trainingSessions.length, '条记录');

    // 3. 获取个性化档案
    const personalityProfile = await AIPersonalizationService.getPersonalityProfile(persona.id);
    console.log('📊 个性化档案:', personalityProfile);

    // 4. 如果没有传入市场数据，尝试获取最新数据
    let currentMarketData = marketData;
    if (!currentMarketData) {
      try {
        console.log('📈 获取最新市场数据...');
        currentMarketData = await MarketDataAggregator.getComprehensiveMarketData();
      } catch (error) {
        console.warn('获取市场数据失败，使用基础模式:', error);
      }
    }

    // 5. 生成增强的AI回复
    const deepseek = new DeepSeekAI();
    let response: string;

    if (personalityProfile && currentMarketData) {
      // 使用个性化提示词 + 市场数据
      const enhancedPrompt = generateEnhancedPrompt(
        personalityProfile,
        persona,
        currentMarketData,
        userMessage
      );

      console.log('🎯 使用增强提示词进行咨询（个性化+市场数据）');
      response = await deepseek.consultWithPersonalizedPrompt(
        enhancedPrompt,
        userMessage
      );
    } else if (personalityProfile) {
      // 使用个性化提示词
      const personalizedPrompt = AIPersonalizationService.generatePersonalizedPrompt(
        personalityProfile,
        persona.personality_type
      );

      console.log('🎯 使用个性化提示词进行咨询');
      response = await deepseek.consultWithPersonalizedPrompt(
        personalizedPrompt,
        userMessage
      );
    } else if (currentMarketData) {
      // 使用市场数据增强的基础咨询
      const marketPrompt = MarketDataAggregator.generateAnalysisPrompt(
        currentMarketData,
        userMessage,
        {
          name: persona.name,
          personalityType: persona.personality_type,
          riskLevel: persona.risk_level,
          specialization: persona.specialization
        }
      );

      console.log('📊 使用市场数据增强咨询');
      response = await deepseek.chat([
        { role: 'user', content: marketPrompt }
      ]);
    } else {
      // 基础咨询模式
      console.log('⚠️ 使用基础咨询模式');
      response = await deepseek.generatePersonalizedAdvice(
        persona.personality_type,
        persona.risk_level,
        userMessage,
        null
      );
    }

    // 6. 保存咨询记录
    await Database.addTrainingSession(
      personaId,
      userMessage,
      response,
      'consultation'
    );

    console.log('✅ AI咨询完成');

    return NextResponse.json({
      success: true,
      response: response,
      persona: {
        id: persona.id,
        name: persona.name,
        personality_type: persona.personality_type,
        avatar_url: persona.avatar_url
      },
      hasMarketData: !!currentMarketData,
      marketDataTimestamp: currentMarketData?.timestamp
    });

  } catch (error) {
    console.error('❌ AI咨询错误:', error);
    return NextResponse.json(
      { success: false, error: 'AI咨询失败，请重试' },
      { status: 500 }
    );
  }
}

// 生成增强的提示词，结合个性化档案和市场数据
function generateEnhancedPrompt(
  personalityProfile: any,
  persona: any,
  marketData: any,
  userMessage: string
): string {
  const marketContext = generateMarketContext(marketData);
  
  return `你是${persona.name}，一个专业的${persona.personality_type}AI投资顾问。

📊 **个性化档案**：
${JSON.stringify(personalityProfile, null, 2)}

📈 **实时市场数据**：
${marketContext}

🎯 **专业领域**：${persona.specialization}
⚖️ **风险偏好**：${persona.risk_level}

基于以上个性化档案和实时市场数据，请回答用户问题：
"${userMessage}"

**重要格式要求**：
- 请直接以纯文本形式回复，不要使用代码块、Mermaid图表或markdown格式
- 使用emoji和简洁的段落结构
- 直接给出分析和建议，无需特殊格式

请确保回答：
1. 符合用户的个性化投资偏好
2. 结合当前市场实际情况
3. 提供具体可执行的建议
4. 包含适当的风险提示
5. 如果涉及交易，优先推荐Jupiter聚合器

请包含以下内容：
🔍 **市场分析**：[基于实时数据的分析]
💡 **个性化建议**：[符合用户偏好的建议]
⚠️ **风险提示**：[相关风险说明]
📈 **具体操作**：[可执行的操作步骤]`;
}

// 生成市场数据上下文
function generateMarketContext(marketData: any): string {
  if (!marketData) return '暂无实时市场数据';

  const prices = marketData.prices || {};
  const sentiment = marketData.marketSentiment || 'neutral';
  const topTraded = marketData.topTraded || [];
  
  let context = `• 市场情绪：${sentiment}\n`;
  context += `• 数据时间：${new Date(marketData.timestamp).toLocaleString()}\n`;
  
  // 主要代币价格
  const mainTokens = Object.entries(prices).slice(0, 3);
  if (mainTokens.length > 0) {
    context += `• 主要代币价格：\n`;
    mainTokens.forEach(([token, data]: [string, any]) => {
      context += `  - ${data.symbol || 'Token'}: $${data.price?.toFixed(4) || 'N/A'} (${data.change24h >= 0 ? '+' : ''}${data.change24h?.toFixed(2) || '0'}%)\n`;
    });
  }
  
  // 热门交易代币
  if (topTraded.length > 0) {
    context += `• 热门交易代币：${topTraded.slice(0, 5).map((t: any) => t.symbol || t.name).filter(Boolean).join(', ')}\n`;
  }
  
  return context;
}
