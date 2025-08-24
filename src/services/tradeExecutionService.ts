import { IProvider } from '@web3auth/base';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { JupiterAPI } from './jupiterAPI';
import { createRobustConnection } from '@/utils/rpcConfig';

// 交易参数接口
export interface TradeParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

// 交易确认数据接口
export interface TradeConfirmationData {
  inputToken: {
    symbol: string;
    mint: string;
    amount: string;
    decimals: number;
  };
  outputToken: {
    symbol: string;
    mint: string;
    estimatedAmount: string;
    decimals: number;
  };
  priceImpact: string;
  minimumReceived: string;
  networkFee: string;
  platformFee: string;
  route: any[];
  quote: any;
  expiresAt: number;
}

// 交易结果接口
export interface TradeResult {
  success: boolean;
  signature: string | null;
  error?: string;
  inputAmount: string | null;
  outputAmount: string | null;
  priceImpact: string | null;
}

export class TradeExecutionService {
  private connection: Connection;
  private userPublicKey: string;
  private sendTransactionFn: (transaction: Transaction | VersionedTransaction) => Promise<string>;

  constructor(
    provider: IProvider,
    userPublicKey: string,
    sendTransactionFn: (transaction: Transaction | VersionedTransaction) => Promise<string>
  ) {
    this.connection = createRobustConnection();
    this.userPublicKey = userPublicKey;
    this.sendTransactionFn = sendTransactionFn;
  }

  // 获取交易确认数据
  async getTradeConfirmation(params: TradeParams): Promise<TradeConfirmationData> {
    try {
      // 1. 获取Jupiter报价
      const quote = await JupiterAPI.getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 50
      });

      if (!quote) {
        throw new Error('无法获取交换报价');
      }

      // 2. 获取代币信息
      const inputTokenInfo = this.getTokenInfo(params.inputMint);
      const outputTokenInfo = this.getTokenInfo(params.outputMint);

      // 3. 计算最小接收数量 (考虑滑点)
      const slippageBps = params.slippageBps || 50;
      const minimumReceived = (BigInt(quote.outAmount) * BigInt(10000 - slippageBps) / BigInt(10000)).toString();

      // 4. 构建确认数据
      const confirmationData: TradeConfirmationData = {
        inputToken: {
          symbol: inputTokenInfo.symbol,
          mint: params.inputMint,
          amount: this.formatTokenAmount(quote.inAmount, inputTokenInfo.decimals),
          decimals: inputTokenInfo.decimals
        },
        outputToken: {
          symbol: outputTokenInfo.symbol,
          mint: params.outputMint,
          estimatedAmount: this.formatTokenAmount(quote.outAmount, outputTokenInfo.decimals),
          decimals: outputTokenInfo.decimals
        },
        priceImpact: quote.priceImpactPct || '0',
        minimumReceived: this.formatTokenAmount(minimumReceived, outputTokenInfo.decimals),
        networkFee: '0.000005', // 估算的网络费用
        platformFee: '0', // Jupiter不收取平台费用
        route: quote.routePlan || [],
        quote,
        expiresAt: Date.now() + 30000 // 30秒后过期
      };

      return confirmationData;
    } catch (error: any) {
      console.error('获取交易确认数据失败:', error);
      throw new Error(error.message || '获取交易确认数据失败');
    }
  }

  // 执行交易
  async executeTrade(params: TradeParams): Promise<TradeResult> {
    try {
      // 1. 重新获取最新报价
      const quote = await JupiterAPI.getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 50
      });

      if (!quote) {
        throw new Error('无法获取最新报价');
      }

      // 2. 构建交换交易
      const swapData = await JupiterAPI.getSwapTransaction({
        quoteResponse: quote,
        userPublicKey: this.userPublicKey,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: 10000,
        asLegacyTransaction: true // 强制使用 Legacy Transaction
      });

      if (!swapData) {
        throw new Error('无法构建交换交易');
      }

      // 3. 反序列化交易
      const transaction = this.deserializeTransaction(swapData.swapTransaction);

      // 4. 发送交易
      const signature = await this.sendTransactionFn(transaction);

      // 5. 等待确认
      await this.waitForConfirmation(signature);

      // 6. 构建成功结果
      const inputTokenInfo = this.getTokenInfo(params.inputMint);
      const outputTokenInfo = this.getTokenInfo(params.outputMint);

      const result: TradeResult = {
        success: true,
        signature,
        inputAmount: this.formatTokenAmount(quote.inAmount, inputTokenInfo.decimals),
        outputAmount: this.formatTokenAmount(quote.outAmount, outputTokenInfo.decimals),
        priceImpact: quote.priceImpactPct || '0'
      };

      return result;
    } catch (error: any) {
      console.error('执行交易失败:', error);
      
      const result: TradeResult = {
        success: false,
        signature: null,
        error: error.message || '交易执行失败',
        inputAmount: null,
        outputAmount: null,
        priceImpact: null
      };

      return result;
    }
  }

  // 反序列化交易
  private deserializeTransaction(serializedTransaction: string): Transaction | VersionedTransaction {
    try {
      console.log('开始反序列化Jupiter交易...');
      const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
      
      // 首先尝试作为 VersionedTransaction 反序列化
      try {
        const versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);
        console.log('检测到 VersionedTransaction，尝试转换为 Legacy Transaction');
        
        // 由于Web3Auth不完全支持VersionedTransaction，我们需要转换为Legacy Transaction
        // 但转换VersionedTransaction到Legacy Transaction是复杂的，让我们先记录并处理这种情况
        return versionedTransaction;
        
      } catch (versionedError) {
        console.log('不是VersionedTransaction，尝试Legacy Transaction...');
        
        // 尝试作为Legacy Transaction反序列化
        const legacyTransaction = Transaction.from(transactionBuffer);
        console.log('成功反序列化为 Legacy Transaction');
        return legacyTransaction;
      }
      
    } catch (error) {
      console.error('反序列化交易失败:', error);
      throw new Error(`无效的交易数据: ${error}`);
    }
  }

  // 等待交易确认
  private async waitForConfirmation(signature: string): Promise<void> {
    try {
      // 检查是否为演示模式
      if (signature.startsWith('DEMO_')) {
        console.log('🎭 DEMO模式 - 跳过真实交易确认，模拟成功');
        // 模拟确认延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
      }
      
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`交易失败: ${confirmation.value.err}`);
      }
    } catch (error: any) {
      // 如果是演示模式，不要抛出真实错误
      if (signature.startsWith('DEMO_')) {
        console.log('🎭 DEMO模式 - 模拟确认成功');
        return;
      }
      
      console.error('等待交易确认失败:', error);
      throw new Error(error.message || '交易确认失败');
    }
  }

  // 获取代币信息
  private getTokenInfo(mint: string): { symbol: string; decimals: number } {
    const tokenMap: Record<string, { symbol: string; decimals: number }> = {
      [JupiterAPI.TOKENS.SOL]: { symbol: 'SOL', decimals: 9 },
      [JupiterAPI.TOKENS.USDC]: { symbol: 'USDC', decimals: 6 },
      [JupiterAPI.TOKENS.RAY]: { symbol: 'RAY', decimals: 6 },
      [JupiterAPI.TOKENS.ORCA]: { symbol: 'ORCA', decimals: 6 },
      [JupiterAPI.TOKENS.JUP]: { symbol: 'JUP', decimals: 6 }
    };

    return tokenMap[mint] || { symbol: 'UNKNOWN', decimals: 6 };
  }

  // 格式化代币数量
  private formatTokenAmount(amount: string, decimals: number): string {
    try {
      const amountBigInt = BigInt(amount);
      const divisor = BigInt(10 ** decimals);
      const wholePart = amountBigInt / divisor;
      const fractionalPart = amountBigInt % divisor;
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      if (trimmedFractional === '') {
        return wholePart.toString();
      }
      
      return `${wholePart}.${trimmedFractional}`;
    } catch (error) {
      console.error('格式化代币数量失败:', error);
      return '0';
    }
  }
}