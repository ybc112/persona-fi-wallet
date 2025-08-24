import { NextRequest, NextResponse } from 'next/server';
import { MarketDataAggregator } from '@/services/marketDataAggregator';

export async function GET(request: NextRequest) {
  try {
    console.log('获取Jupiter市场数据API调用');
    
    const marketData = await MarketDataAggregator.getComprehensiveMarketData();
    
    if (!marketData) {
      return NextResponse.json(
        { success: false, error: '无法获取市场数据' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Jupiter市场数据API错误:', error);
    return NextResponse.json(
      { success: false, error: '获取市场数据失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json();
    
    switch (action) {
      case 'getTokenDetails':
        if (!params?.tokenMint) {
          return NextResponse.json(
            { success: false, error: '缺少tokenMint参数' },
            { status: 400 }
          );
        }
        
        const tokenDetails = await MarketDataAggregator.getTokenDetails(params.tokenMint);
        return NextResponse.json({
          success: true,
          data: tokenDetails
        });
        
      case 'getSwapSuggestion':
        if (!params?.inputMint || !params?.outputMint || !params?.amount) {
          return NextResponse.json(
            { success: false, error: '缺少必要的交换参数' },
            { status: 400 }
          );
        }
        
        const swapSuggestion = await MarketDataAggregator.getSwapSuggestion(
          params.inputMint,
          params.outputMint,
          params.amount
        );
        
        return NextResponse.json({
          success: true,
          data: swapSuggestion
        });
        
      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Jupiter API POST错误:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
