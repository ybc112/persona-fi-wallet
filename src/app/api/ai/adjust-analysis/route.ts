import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAI } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { originalAnalysis, userFeedback, personalityType, riskLevel, marketData } = await request.json();

    if (!originalAnalysis || !userFeedback || !personalityType || !riskLevel) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const deepseek = new DeepSeekAI();
    
    // 构建包含市场数据的调整提示词
    let marketContext = '';
    if (marketData && marketData.prices) {
      const solPrice = marketData.prices['So11111111111111111111111111111111111111112']?.price || 'N/A';
      const marketSentiment = marketData.marketSentiment || 'neutral';
      const trendingTokens = marketData.trending?.slice(0, 5).map((t: any) => t.symbol).join(', ') || 'N/A';

      marketContext = `

当前Solana生态市场数据（来自Jupiter聚合器）：
- SOL价格: $${solPrice}
- 市场情绪: ${marketSentiment}
- 热门代币: ${trendingTokens}
- 数据更新时间: ${new Date(marketData.timestamp).toLocaleString()}
`;
    }

    const adjustPrompt = `
作为专业的Solana生态投资顾问，请根据用户的反馈调整之前的分析结果。

用户类型：${personalityType}
风险等级：${riskLevel}${marketContext}

原始分析：
${originalAnalysis}

用户反馈：
${userFeedback}

请根据用户的反馈，结合当前Solana生态的市场情况，调整分析结果。保持相同的格式：

📊 **投资经验**：[调整后的分析]
🎯 **风险偏好**：[调整后的分析]
⏰ **投资目标**：[调整后的分析]
🔍 **关注领域**：[调整后的分析]
🧠 **决策风格**：[调整后的分析]
💰 **资金管理**：[调整后的分析]

确保调整后的分析更准确地反映用户的真实情况和对Solana生态的理解。
`;

    const adjustedAnalysis = await deepseek.chat([
      { role: 'user', content: adjustPrompt }
    ]);

    return NextResponse.json({
      success: true,
      adjustedAnalysis
    });

  } catch (error) {
    console.error('AI调整错误:', error);
    return NextResponse.json(
      { success: false, error: 'AI调整失败，请重试' },
      { status: 500 }
    );
  }
}
