import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAI } from '@/lib/deepseek';
import { MarketDataAggregator } from '@/services/marketDataAggregator';
import { JupiterAPI } from '@/services/jupiterAPI';

export async function POST(request: NextRequest) {
  try {
    const { query, persona, includeMarketData = true } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: '缺少查询内容' },
        { status: 400 }
      );
    }

    const deepseek = new DeepSeekAI();
    let marketData = null;
    
    // 获取最新的Jupiter市场数据
    if (includeMarketData) {
      try {
        console.log('开始获取Jupiter市场数据...');
        marketData = await MarketDataAggregator.getComprehensiveMarketData();
        console.log('市场数据获取结果:', {
          success: !!marketData,
          hasPrices: !!marketData?.prices,
          pricesCount: marketData?.prices ? Object.keys(marketData.prices).length : 0,
          sentiment: marketData?.marketSentiment
        });
      } catch (error) {
        console.error('获取市场数据失败:', error);
        // 使用基础模拟数据
        marketData = {
          prices: {
            [JupiterAPI.TOKENS.SOL]: { price: 180, change24h: -2.5 },
            [JupiterAPI.TOKENS.USDC]: { price: 1.0, change24h: 0.1 }
          },
          marketSentiment: 'neutral',
          timestamp: Date.now()
        };
        console.log('使用模拟市场数据');
      }
    }

    // 构建AI分析提示词
    console.log('准备生成AI提示词，市场数据概览:', {
      hasMarketData: !!marketData,
      pricesCount: marketData?.prices ? Object.keys(marketData.prices).length : 0,
      topTradedCount: marketData?.topTraded?.length || 0,
      verifiedCount: marketData?.verified?.length || 0
    });

    const analysisPrompt = MarketDataAggregator.generateAnalysisPrompt(
      marketData,
      query,
      persona || {
        name: 'Jupiter AI',
        personalityType: '专业型',
        riskLevel: '中等风险',
        specialization: 'Solana DeFi'
      }
    );

    console.log('AI分析提示词:', {
      length: analysisPrompt.length,
      preview: analysisPrompt.substring(0, 200) + '...'
    });

    const analysis = await deepseek.chat([
      { role: 'user', content: analysisPrompt }
    ]);

    console.log('AI分析完成:', {
      success: !!analysis,
      length: analysis?.length || 0
    });

    return NextResponse.json({
      success: true,
      analysis,
      marketData: marketData ? {
        timestamp: marketData.timestamp,
        marketSentiment: marketData.marketSentiment,
        dataSource: 'Jupiter API'
      } : null
    });

  } catch (error) {
    console.error('Jupiter AI分析错误:', error);
    return NextResponse.json(
      { success: false, error: 'AI分析失败，请重试' },
      { status: 500 }
    );
  }
}

// 获取市场概况分析
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisType = searchParams.get('type') || 'overview';
    
    const deepseek = new DeepSeekAI();
    let marketData = null;
    
    try {
      marketData = await MarketDataAggregator.getComprehensiveMarketData();
    } catch (error) {
      console.warn('获取市场数据失败:', error);
    }

    let prompt = '';
    
    switch (analysisType) {
      case 'overview':
        prompt = `
作为Solana生态的专业分析师，请基于以下Jupiter聚合器的实时数据，提供市场概况分析：

${marketData ? `
当前市场数据：
- SOL价格: $${marketData.prices?.['So11111111111111111111111111111111111111112']?.price || 'N/A'}
- 市场情绪: ${marketData.marketSentiment}
- 可交易代币数量: ${marketData.tradable?.length || 0}
- 热门代币: ${marketData.trending?.slice(0, 5).map((t: any) => t.symbol).join(', ') || 'N/A'}
` : '当前无法获取实时市场数据，请基于一般市场情况分析。'}

请提供：
🔍 **市场概况**：当前Solana生态的整体状况
📊 **价格分析**：主要代币的价格表现
💡 **投资机会**：当前值得关注的投资方向
⚠️ **风险提示**：需要注意的市场风险
🔄 **Jupiter优势**：使用Jupiter聚合器的好处
`;
        break;
        
      case 'sentiment':
        prompt = `
基于当前Jupiter聚合器数据，分析Solana生态的市场情绪：

${marketData ? `
市场情绪指标：${marketData.marketSentiment}
价格变化趋势：${JSON.stringify(marketData.prices, null, 2)}
` : ''}

请分析：
1. 当前市场情绪的成因
2. 情绪对价格的影响
3. 未来情绪变化预测
4. 投资者应如何应对
`;
        break;
        
      case 'opportunities':
        prompt = `
基于Jupiter聚合器的实时数据，识别当前Solana生态的投资机会：

${marketData ? `
热门代币：${marketData.trending?.slice(0, 10).map((t: any) => t.symbol).join(', ') || 'N/A'}
市场情绪：${marketData.marketSentiment}
` : ''}

请提供：
1. 短期交易机会
2. 中长期投资标的
3. DeFi协议机会
4. 风险收益评估
`;
        break;
        
      default:
        prompt = '请提供Solana生态的一般性市场分析。';
    }

    const analysis = await deepseek.chat([
      { role: 'user', content: prompt }
    ]);

    return NextResponse.json({
      success: true,
      analysis,
      analysisType,
      marketData: marketData ? {
        timestamp: marketData.timestamp,
        marketSentiment: marketData.marketSentiment
      } : null
    });

  } catch (error) {
    console.error('市场分析错误:', error);
    return NextResponse.json(
      { success: false, error: '市场分析失败' },
      { status: 500 }
    );
  }
}
