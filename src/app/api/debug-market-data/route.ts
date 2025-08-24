import { NextRequest, NextResponse } from 'next/server';
import { MarketDataAggregator } from '@/services/marketDataAggregator';
import { JupiterAPI } from '@/services/jupiterAPI';

export async function GET(request: NextRequest) {
  try {
    console.log('=== 开始调试市场数据流 ===');
    
    // 步骤1: 测试单独的价格API
    console.log('步骤1: 测试价格API');
    const priceTest = await JupiterAPI.getTokenPrices([
      JupiterAPI.TOKENS.SOL,
      JupiterAPI.TOKENS.USDC,
      JupiterAPI.TOKENS.RAY
    ]);
    console.log('价格API原始响应:', priceTest);
    
    // 步骤2: 测试价格数据格式化
    console.log('步骤2: 测试价格数据格式化');
    const formattedPrices = JupiterAPI.formatPriceData(priceTest);
    console.log('格式化后的价格:', formattedPrices);
    
    // 步骤3: 测试完整市场数据
    console.log('步骤3: 测试完整市场数据');
    const fullMarketData = await MarketDataAggregator.getComprehensiveMarketData();
    console.log('完整市场数据:', {
      hasPrices: !!fullMarketData?.prices,
      pricesKeys: fullMarketData?.prices ? Object.keys(fullMarketData.prices) : [],
      topTradedCount: fullMarketData?.topTraded?.length || 0,
      verifiedCount: fullMarketData?.verified?.length || 0,
      sentiment: fullMarketData?.marketSentiment
    });
    
    // 步骤4: 测试AI提示词生成
    console.log('步骤4: 测试AI提示词生成');
    const testPrompt = MarketDataAggregator.generateAnalysisPrompt(
      fullMarketData,
      '当前市场如何？',
      { name: 'Test AI', personalityType: '专业型', riskLevel: '中等风险' }
    );
    console.log('生成的提示词长度:', testPrompt.length);
    console.log('提示词预览:', testPrompt.substring(0, 500) + '...');
    
    return NextResponse.json({
      success: true,
      debug: {
        step1_priceAPI: {
          success: !!priceTest,
          data: priceTest
        },
        step2_formatting: {
          success: !!formattedPrices,
          data: formattedPrices
        },
        step3_fullData: {
          success: !!fullMarketData,
          summary: {
            hasPrices: !!fullMarketData?.prices,
            pricesCount: fullMarketData?.prices ? Object.keys(fullMarketData.prices).length : 0,
            topTradedCount: fullMarketData?.topTraded?.length || 0,
            verifiedCount: fullMarketData?.verified?.length || 0,
            sentiment: fullMarketData?.marketSentiment
          }
        },
        step4_prompt: {
          success: !!testPrompt,
          length: testPrompt?.length || 0,
          preview: testPrompt?.substring(0, 300) || ''
        }
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('调试市场数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
