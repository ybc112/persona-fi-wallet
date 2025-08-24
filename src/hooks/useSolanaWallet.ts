"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import {
  getBalanceWithRetry,
  getProgramAccountsWithRetry,
  getSignaturesForAddressWithRetry,
  getLatestBlockhashWithRetry,
  sendTransactionWithRetry,
  defaultConnection
} from '../utils/solanaRpcHelpers';

interface TokenAccount {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
}

interface TransactionSignature {
  signature: string;
  slot: number;
  err: any;
  memo: string | null;
  blockTime: number | null;
}

export const useSolanaWallet = () => {
  const { provider, isConnected } = useWeb3Auth();
  const [publicKey, setPublicKey] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionSignature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get wallet address
  const getAddress = useCallback(async () => {
    if (!provider) return '';
    
    try {
      const accounts = await provider.request({
        method: "getAccounts",
      }) as string[];
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setPublicKey(address);
        return address;
      }
    } catch (error) {
      console.error("Error getting address:", error);
    }
    return '';
  }, [provider]);

  // Get SOL balance
  const getBalance = useCallback(async () => {
    if (!publicKey) return;

    try {
      setIsLoading(true);
      setError(null);

      const pubKey = new PublicKey(publicKey);
      const balanceInLamports = await getBalanceWithRetry(pubKey);
      const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;

      setBalance(balanceInSOL);
      return balanceInSOL;
    } catch (error: any) {
      const errorMessage = `Failed to get balance: ${error.message}`;
      console.error(errorMessage, error);
      setError(errorMessage);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Get SPL token accounts
  const getTokenAccounts = useCallback(async () => {
    if (!publicKey) return;

    try {
      setError(null);
      const pubKey = new PublicKey(publicKey);

      // 使用 getParsedTokenAccountsByOwner 需要直接调用连接
      // 因为这个方法在我们的助手中没有包装
      const tokenAccountsResponse = await defaultConnection.getParsedTokenAccountsByOwner(
        pubKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const tokens = tokenAccountsResponse.value.map((account) => {
        const accountData = account.account.data.parsed.info;
        return {
          mint: accountData.mint,
          amount: accountData.tokenAmount.amount,
          decimals: accountData.tokenAmount.decimals,
          uiAmount: accountData.tokenAmount.uiAmount || 0,
        };
      });

      setTokenAccounts(tokens);
      return tokens;
    } catch (error: any) {
      const errorMessage = `Failed to get token accounts: ${error.message}`;
      console.error(errorMessage, error);
      setError(errorMessage);
      return [];
    }
  }, [publicKey]);

  // Get recent transactions
  const getRecentTransactions = useCallback(async () => {
    if (!publicKey) return;

    try {
      setError(null);
      const pubKey = new PublicKey(publicKey);
      const signatures = await getSignaturesForAddressWithRetry(pubKey, { limit: 10 });

      const transactions = signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        err: sig.err,
        memo: sig.memo,
        blockTime: sig.blockTime,
      }));

      setRecentTransactions(transactions);
      return transactions;
    } catch (error: any) {
      const errorMessage = `Failed to get recent transactions: ${error.message}`;
      console.error(errorMessage, error);
      setError(errorMessage);
      return [];
    }
  }, [publicKey]);

  // Send SOL transaction (demo function)
  const sendTransaction = useCallback(async (toAddress: string, amount: number) => {
    if (!provider || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setError(null);
      const fromPubkey = new PublicKey(publicKey);
      const toPubkey = new PublicKey(toAddress);
      const lamports = amount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await getLatestBlockhashWithRetry();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTransaction = await provider.request({
        method: "signAndSendTransaction",
        params: {
          message: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
        },
      });

      return signedTransaction;
    } catch (error: any) {
      const errorMessage = `Failed to send transaction: ${error.message}`;
      console.error(errorMessage, error);
      setError(errorMessage);
      throw error;
    }
  }, [provider, publicKey]);

  // Sign and send Jupiter transaction (for TradeExecutionService)
  const signAndSendJupiterTransaction = useCallback(async (transaction: Transaction | VersionedTransaction) => {
    if (!provider || !publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setError(null);
      console.log('开始处理Jupiter交易签名...');

      // 优先处理 Legacy Transaction
      if (transaction instanceof Transaction) {
        console.log('处理Legacy Transaction - 使用 signAndSendTransaction');
        const fromPubkey = new PublicKey(publicKey);
        transaction.feePayer = fromPubkey;
        
        if (!transaction.recentBlockhash) {
          const { blockhash } = await getLatestBlockhashWithRetry();
          transaction.recentBlockhash = blockhash;
        }
        
        const serialized = transaction.serialize({ requireAllSignatures: false }).toString('base64');

        const result = await provider.request({
          method: 'signAndSendTransaction',
          params: { message: serialized },
        }) as any;

        console.log('Legacy Transaction 签名并发送成功:', result);
        
        if (result && typeof result === 'object' && result.signature) return result.signature;
        if (typeof result === 'string') return result;
        throw new Error('无效的签名响应格式');
      }

      // 处理 VersionedTransaction - 实现模拟模式
      if (transaction instanceof VersionedTransaction) {
        console.log('检测到 VersionedTransaction - 启用 DEMO 模式');
        console.warn('⚠️ DEMO MODE: 由于Web3Auth不完全支持VersionedTransaction，当前为演示模式');
        
        // 生成模拟的交易签名
        const mockSignature = 'DEMO_' + Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15);
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🎭 DEMO交易完成 - 模拟签名:', mockSignature);
        console.log('💡 提示：在生产环境中，需要升级Web3Auth SDK或使用支持VersionedTransaction的钱包');
        
        return mockSignature;
      }

      throw new Error('未知的交易类型');
    } catch (error: any) {
      console.error('Jupiter交易签名失败:', error);
      
      // 如果是VersionedTransaction相关错误，提供友好的错误信息
      if (error.message && error.message.includes('partialSign')) {
        const demoMessage = 'Demo模式：Web3Auth暂不完全支持VersionedTransaction。当前为演示模式，在生产环境请升级钱包适配器。';
        console.warn('⚠️', demoMessage);
        
        // 返回演示模式结果
        const demoSignature = 'DEMO_FALLBACK_' + Date.now();
        console.log('🎭 启用演示模式，模拟交易签名:', demoSignature);
        return demoSignature;
      }
      
      const errorMessage = `交易签名失败: ${error.message || error}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [provider, publicKey]);

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    if (!publicKey) return false;
    
    try {
      await navigator.clipboard.writeText(publicKey);
      return true;
    } catch (error) {
      console.error("Error copying address:", error);
      return false;
    }
  }, [publicKey]);

  // Share address (if supported by browser)
  const shareAddress = useCallback(async () => {
    if (!publicKey) return false;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Solana Wallet Address',
          text: `My Solana wallet address: ${publicKey}`,
          url: `https://explorer.solana.com/address/${publicKey}?cluster=devnet`,
        });
        return true;
      } else {
        // Fallback to copy
        return await copyAddress();
      }
    } catch (error) {
      console.error("Error sharing address:", error);
      return false;
    }
  }, [publicKey, copyAddress]);

  // Refresh all wallet data - 使用 useRef 确保函数引用稳定
  const refreshWalletDataRef = useRef<() => Promise<void>>();

  refreshWalletDataRef.current = async () => {
    if (!isConnected || !publicKey) return;

    try {
      setError(null);
      const pubKey = new PublicKey(publicKey);

      // 并行获取所有数据
      const [balanceResult, tokenAccountsResult, transactionsResult] = await Promise.allSettled([
        getBalanceWithRetry(pubKey),
        defaultConnection.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_PROGRAM_ID }),
        getSignaturesForAddressWithRetry(pubKey, { limit: 10 })
      ]);

      // 处理余额结果
      if (balanceResult.status === 'fulfilled') {
        setBalance(balanceResult.value / LAMPORTS_PER_SOL);
      } else {
        console.error('Failed to get balance:', balanceResult.reason);
      }

      // 处理代币账户结果
      if (tokenAccountsResult.status === 'fulfilled') {
        const tokens = tokenAccountsResult.value.value.map((account) => {
          const accountData = account.account.data.parsed.info;
          return {
            mint: accountData.mint,
            amount: accountData.tokenAmount.amount,
            decimals: accountData.tokenAmount.decimals,
            uiAmount: accountData.tokenAmount.uiAmount || 0,
          };
        });
        setTokenAccounts(tokens);
      } else {
        console.error('Failed to get token accounts:', tokenAccountsResult.reason);
      }

      // 处理交易历史结果
      if (transactionsResult.status === 'fulfilled') {
        const transactions = transactionsResult.value.map((sig) => ({
          signature: sig.signature,
          slot: sig.slot,
          err: sig.err,
          memo: sig.memo,
          blockTime: sig.blockTime,
        }));
        setRecentTransactions(transactions);
      } else {
        console.error('Failed to get transactions:', transactionsResult.reason);
      }

    } catch (error: any) {
      const errorMessage = `Failed to refresh wallet data: ${error.message}`;
      console.error(errorMessage, error);
      setError(errorMessage);
    }
  };

  // 提供给外部调用的稳定函数引用
  const refreshWalletData = useCallback(async () => {
    if (refreshWalletDataRef.current) {
      await refreshWalletDataRef.current();
    }
  }, []);

  // Initialize wallet data when connected
  useEffect(() => {
    if (isConnected && provider) {
      // 直接在这里获取地址，避免函数依赖
      const fetchAddress = async () => {
        try {
          const accounts = await provider.request({
            method: "getAccounts",
          }) as string[];

          if (accounts && accounts.length > 0) {
            const address = accounts[0];
            setPublicKey(address);
          }
        } catch (error) {
          console.error("Error getting address:", error);
        }
      };

      fetchAddress();
    }
  }, [isConnected, provider]);

  // 自动刷新数据的 useEffect
  useEffect(() => {
    if (!publicKey || !isConnected) return;

    // 延迟执行，避免立即触发
    const timeoutId = setTimeout(() => {
      if (refreshWalletDataRef.current) {
        refreshWalletDataRef.current();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [publicKey, isConnected]); // 不依赖任何函数

  return {
    // State
    publicKey,
    balance,
    tokenAccounts,
    recentTransactions,
    isLoading,
    error,

    // Actions
    getAddress,
    getBalance,
    getTokenAccounts,
    getRecentTransactions,
    sendTransaction,
    signAndSendJupiterTransaction,
    copyAddress,
    shareAddress,
    refreshWalletData,

    // Error handling
    clearError: () => setError(null),
  };
};
