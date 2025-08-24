import { useState, useEffect, useCallback } from 'react';
import { MarketDataAggregator } from '../services/marketDataAggregator';
import { JupiterAPI } from '../services/jupiterAPI';

// Jupiter市场数据Hook
export function useJupiterMarketData() {
  const [marketData, setMarketData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('开始获取Jupiter市场数据...');
      const data = await MarketDataAggregator.getComprehensiveMarketData();
      
      if (data) {
        setMarketData(data);
        setLastUpdate(new Date());
        console.log('市场数据更新成功');
      } else {
        setError('无法获取市场数据');
      }
    } catch (err: any) {
      console.error('获取市场数据失败:', err);
      setError(err.message || '获取市场数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 立即获取数据
    fetchMarketData();

    // 每30秒更新一次数据
    const interval = setInterval(fetchMarketData, 30000);

    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return { 
    marketData, 
    isLoading, 
    error, 
    lastUpdate,
    refetch: fetchMarketData 
  };
}

// Jupiter交换Hook
export function useJupiterSwap() {
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<any>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const getQuote = useCallback(async (params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
  }) => {
    try {
      setSwapError(null);
      const quote = await JupiterAPI.getQuote(params);
      return quote;
    } catch (error: any) {
      setSwapError(error.message);
      return null;
    }
  }, []);

  const executeSwap = useCallback(async (params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
    slippageBps?: number;
  }) => {
    try {
      setIsSwapping(true);
      setSwapError(null);
      
      // 1. 获取报价
      const quote = await JupiterAPI.getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps
      });

      if (!quote) {
        throw new Error('无法获取交换报价');
      }

      // 2. 获取交换交易
      const swapData = await JupiterAPI.getSwapTransaction({
        quoteResponse: quote,
        userPublicKey: params.userPublicKey,
        prioritizationFeeLamports: 10000
      });

      if (!swapData) {
        throw new Error('无法获取交换交易');
      }

      const result = {
        success: true,
        quote,
        swapTransaction: swapData.swapTransaction,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      };

      setSwapResult(result);
      return result;
    } catch (error: any) {
      console.error('执行交换失败:', error);
      const errorResult = {
        success: false,
        error: error.message
      };
      setSwapError(error.message);
      setSwapResult(errorResult);
      return errorResult;
    } finally {
      setIsSwapping(false);
    }
  }, []);

  return { 
    getQuote,
    executeSwap, 
    isSwapping, 
    swapResult, 
    swapError,
    clearError: () => setSwapError(null)
  };
}

// 代币详情Hook
export function useTokenDetails(tokenMint: string | null) {
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenMint) {
      setTokenDetails(null);
      return;
    }

    const fetchTokenDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const details = await MarketDataAggregator.getTokenDetails(tokenMint);
        setTokenDetails(details);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenDetails();
  }, [tokenMint]);

  return { tokenDetails, isLoading, error };
}

// 实时价格Hook
export function useRealtimePrice(tokenMint: string) {
  const [price, setPrice] = useState<number>(0);
  const [change24h, setChange24h] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tokenMint) return;

    const fetchPrice = async () => {
      try {
        const priceData = await JupiterAPI.getTokenPrices([tokenMint]);
        if (priceData && priceData[tokenMint]) {
          setPrice(priceData[tokenMint].price);
          setChange24h(priceData[tokenMint].change24h || 0);
        }
      } catch (error) {
        console.error('获取实时价格失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 立即获取价格
    fetchPrice();

    // 每10秒更新一次价格
    const interval = setInterval(fetchPrice, 10000);

    return () => clearInterval(interval);
  }, [tokenMint]);

  return { price, change24h, isLoading };
}
