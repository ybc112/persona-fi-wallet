import { NextRequest, NextResponse } from 'next/server';
import { JupiterAPI } from '@/services/jupiterAPI';

export async function GET(request: NextRequest) {
  try {
    console.log('开始测试Jupiter API连接...');
    
    // 测试1: 获取SOL价格
    console.log('测试1: 获取SOL价格');
    const solPrice = await JupiterAPI.getTokenPrices([JupiterAPI.TOKENS.SOL]);
    console.log('SOL价格结果:', solPrice);
    
    // 测试2: 获取验证代币
    console.log('测试2: 获取验证代币');
    const verifiedTokens = await JupiterAPI.getTrendingTokens('verified');
    console.log('验证代币数量:', verifiedTokens?.length || 0);
    
    // 测试3: 获取热门交易代币
    console.log('测试3: 获取热门交易代币');
    const topTraded = await JupiterAPI.getTopTradedTokens('24h', 5);
    console.log('热门交易代币数量:', topTraded?.length || 0);
    
    // 测试4: 获取最新代币
    console.log('测试4: 获取最新代币');
    const recentTokens = await JupiterAPI.getRecentTokens(5);
    console.log('最新代币数量:', recentTokens?.length || 0);
    
    return NextResponse.json({
      success: true,
      tests: {
        solPrice: {
          success: !!solPrice,
          data: solPrice
        },
        verifiedTokens: {
          success: !!verifiedTokens,
          count: verifiedTokens?.length || 0,
          sample: verifiedTokens?.slice(0, 3)
        },
        topTraded: {
          success: !!topTraded,
          count: topTraded?.length || 0,
          sample: topTraded?.slice(0, 3)
        },
        recentTokens: {
          success: !!recentTokens,
          count: recentTokens?.length || 0,
          sample: recentTokens?.slice(0, 3)
        }
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Jupiter API测试失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'testQuote':
        // 测试获取交换报价
        const quote = await JupiterAPI.getQuote({
          inputMint: JupiterAPI.TOKENS.SOL,
          outputMint: JupiterAPI.TOKENS.USDC,
          amount: 100000000, // 0.1 SOL
          slippageBps: 50
        });
        
        return NextResponse.json({
          success: true,
          quote,
          timestamp: Date.now()
        });
        
      default:
        return NextResponse.json(
          { success: false, error: '不支持的测试操作' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Jupiter测试操作失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
