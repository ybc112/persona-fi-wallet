import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAI } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { personalityType, riskLevel, userDescription, marketData } = await request.json();

    if (!personalityType || !riskLevel || !userDescription) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const deepseek = new DeepSeekAI();

    // 构建包含市场数据的分析提示词
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

    const analysisPrompt = `
作为专业的Solana生态投资顾问，请分析以下用户的投资描述，提取关键特征：

用户类型：${personalityType}
风险等级：${riskLevel}
用户描述：${userDescription}${marketContext}

请从以下维度分析用户的投资特征，并结合当前Solana生态的市场情况：
1. 投资经验水平（新手/中级/高级）
2. 风险承受能力（具体表现）
3. 投资目标和时间周期
4. 偏好的投资领域（特别是对Solana生态的了解）
5. 决策风格（理性/感性/技术分析等）
6. 资金管理习惯

请用简洁明了的语言总结，每个维度用一句话概括。格式如下：

📊 **投资经验**：[分析结果]
🎯 **风险偏好**：[分析结果]
⏰ **投资目标**：[分析结果]
🔍 **关注领域**：[分析结果]
🧠 **决策风格**：[分析结果]
💰 **资金管理**：[分析结果]
`;

    const analysis = await deepseek.chat([
      { role: 'user', content: analysisPrompt }
    ]);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('AI分析错误:', error);
    return NextResponse.json(
      { success: false, error: 'AI分析失败，请重试' },
      { status: 500 }
    );
  }
}

