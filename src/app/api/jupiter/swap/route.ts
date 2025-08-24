import { NextRequest, NextResponse } from 'next/server';
import { JupiterAPI } from '@/services/jupiterAPI';

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json();

    switch (action) {
      case 'getQuote':
        return await handleGetQuote(params);
      
      case 'getSwapTransaction':
        return await handleGetSwapTransaction(params);
      
      case 'executeSwap':
        return await handleExecuteSwap(params);
      
      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作类型' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Jupiter交换API错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '交换操作失败' },
      { status: 500 }
    );
  }
}

// 获取交换报价
async function handleGetQuote(params: any) {
  try {
    const { inputMint, outputMint, amount, slippageBps } = params;

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { success: false, error: '缺少必要的报价参数' },
        { status: 400 }
      );
    }

    const quote = await JupiterAPI.getQuote({
      inputMint,
      outputMint,
      amount: parseInt(amount),
      slippageBps: slippageBps || 50
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: '无法获取交换报价' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        quote,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        route: quote.routePlan
      }
    });

  } catch (error: any) {
    console.error('获取报价失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取报价失败' },
      { status: 500 }
    );
  }
}

// 获取交换交易
async function handleGetSwapTransaction(params: any) {
  try {
    const { quoteResponse, userPublicKey, wrapAndUnwrapSol, prioritizationFeeLamports } = params;

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { success: false, error: '缺少必要的交换参数' },
        { status: 400 }
      );
    }

    const swapData = await JupiterAPI.getSwapTransaction({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: wrapAndUnwrapSol ?? true,
      prioritizationFeeLamports: prioritizationFeeLamports || 10000
    });

    if (!swapData) {
      return NextResponse.json(
        { success: false, error: '无法构建交换交易' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        swapTransaction: swapData.swapTransaction,
        lastValidBlockHeight: swapData.lastValidBlockHeight
      }
    });

  } catch (error: any) {
    console.error('构建交换交易失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '构建交换交易失败' },
      { status: 500 }
    );
  }
}

// 执行完整的交换流程
async function handleExecuteSwap(params: any) {
  try {
    const { inputMint, outputMint, amount, userPublicKey, slippageBps } = params;

    if (!inputMint || !outputMint || !amount || !userPublicKey) {
      return NextResponse.json(
        { success: false, error: '缺少必要的交换参数' },
        { status: 400 }
      );
    }

    // 1. 获取报价
    const quote = await JupiterAPI.getQuote({
      inputMint,
      outputMint,
      amount: parseInt(amount),
      slippageBps: slippageBps || 50
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: '无法获取交换报价' },
        { status: 500 }
      );
    }

    // 2. 构建交换交易
    const swapData = await JupiterAPI.getSwapTransaction({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: 10000
    });

    if (!swapData) {
      return NextResponse.json(
        { success: false, error: '无法构建交换交易' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        quote,
        swapTransaction: swapData.swapTransaction,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        route: quote.routePlan,
        lastValidBlockHeight: swapData.lastValidBlockHeight
      }
    });

  } catch (error: any) {
    console.error('执行交换失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '执行交换失败' },
      { status: 500 }
    );
  }
}

// GET方法 - 用于测试和健康检查
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        return NextResponse.json({
          success: true,
          message: 'Jupiter交换API服务正常',
          timestamp: Date.now(),
          endpoints: [
            'POST /api/jupiter/swap - 执行交换操作',
            'GET /api/jupiter/swap?action=health - 健康检查',
            'GET /api/jupiter/swap?action=tokens - 获取支持的代币'
          ]
        });

      case 'tokens':
        return NextResponse.json({
          success: true,
          data: {
            supportedTokens: {
              SOL: JupiterAPI.TOKENS.SOL,
              USDC: JupiterAPI.TOKENS.USDC,
              RAY: JupiterAPI.TOKENS.RAY,
              ORCA: JupiterAPI.TOKENS.ORCA,
              JUP: JupiterAPI.TOKENS.JUP
            }
          }
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Jupiter交换API',
          usage: {
            POST: {
              getQuote: '获取交换报价',
              getSwapTransaction: '构建交换交易',
              executeSwap: '执行完整交换流程'
            },
            GET: {
              health: '健康检查',
              tokens: '获取支持的代币列表'
            }
          }
        });
    }

  } catch (error: any) {
    console.error('Jupiter交换API GET错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'API错误' },
      { status: 500 }
    );
  }
}