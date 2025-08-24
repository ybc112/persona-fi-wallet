"use client";

import { useState, useCallback } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { TradeExecutionService, TradeParams, TradeConfirmationData, TradeResult } from '@/services/tradeExecutionService';

export interface UseTradeExecutionReturn {
  // 状态
  isLoading: boolean;
  isExecuting: boolean;
  confirmationData: TradeConfirmationData | null;
  result: TradeResult | null;
  error: string | null;
  canExecute: boolean;

  // 方法
  prepareTradeExecution: (params: TradeParams) => Promise<TradeConfirmationData | null>;
  executeTrade: (params: TradeParams) => Promise<TradeResult | null>;
  clearState: () => void;
  clearError: () => void;
}

export function useTradeExecution(): UseTradeExecutionReturn {
  const { isConnected, provider } = useWeb3Auth();
  const { publicKey, signAndSendJupiterTransaction } = useSolanaWallet();

  // 状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmationData, setConfirmationData] = useState<TradeConfirmationData | null>(null);
  const [result, setResult] = useState<TradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 检查是否可以执行交易
  const canExecute = isConnected && !!publicKey && !!provider && !isLoading && !isExecuting;

  // 准备交易执行 - 获取确认数据
  const prepareTradeExecution = useCallback(async (params: TradeParams): Promise<TradeConfirmationData | null> => {
    if (!canExecute) {
      setError('钱包未连接或未准备就绪');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tradeService = new TradeExecutionService(provider!, publicKey!.toString(), signAndSendJupiterTransaction);
      const confirmation = await tradeService.getTradeConfirmation(params);
      
      setConfirmationData(confirmation);
      return confirmation;
    } catch (err: any) {
      console.error('准备交易执行失败:', err);
      setError(err.message || '准备交易失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [canExecute, provider, publicKey, signAndSendJupiterTransaction]);

  // 执行交易
  const executeTrade = useCallback(async (params: TradeParams): Promise<TradeResult | null> => {
    if (!canExecute) {
      setError('钱包未连接或未准备就绪');
      return null;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const tradeService = new TradeExecutionService(provider!, publicKey!.toString(), signAndSendJupiterTransaction);
      const tradeResult = await tradeService.executeTrade(params);
      
      setResult(tradeResult);
      return tradeResult;
    } catch (err: any) {
      console.error('执行交易失败:', err);
      const errorResult: TradeResult = {
        success: false,
        error: err.message || '交易执行失败',
        signature: null,
        inputAmount: null,
        outputAmount: null,
        priceImpact: null
      };
      setResult(errorResult);
      setError(err.message || '交易执行失败');
      return errorResult;
    } finally {
      setIsExecuting(false);
    }
  }, [canExecute, provider, publicKey, signAndSendJupiterTransaction]);

  // 清除所有状态
  const clearState = useCallback(() => {
    setConfirmationData(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    setIsExecuting(false);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状态
    isLoading,
    isExecuting,
    confirmationData,
    result,
    error,
    canExecute,

    // 方法
    prepareTradeExecution,
    executeTrade,
    clearState,
    clearError
  };
}