import { 
  Connection, 
  PublicKey, 
  Transaction, 
  VersionedTransaction,
  SendOptions,
  Commitment,
  GetAccountInfoConfig,
  GetProgramAccountsConfig
} from '@solana/web3.js';
import { robustRpcCall, getRobustConnection } from './rpcConfig';

// 默认配置
const DEFAULT_COMMITMENT: Commitment = 'confirmed';
const DEFAULT_SEND_OPTIONS: SendOptions = {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
  maxRetries: 3,
};

// 带重试的账户信息获取
export async function getAccountInfoWithRetry(
  publicKey: PublicKey,
  config?: GetAccountInfoConfig
): Promise<any> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.getAccountInfo(publicKey, {
      commitment: DEFAULT_COMMITMENT,
      ...config
    }),
    `Get Account Info: ${publicKey.toBase58()}`
  );
}

// 带重试的余额获取
export async function getBalanceWithRetry(
  publicKey: PublicKey,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<number> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.getBalance(publicKey, commitment),
    `Get Balance: ${publicKey.toBase58()}`
  );
}

// 带重试的交易发送
export async function sendTransactionWithRetry(
  transaction: Transaction | VersionedTransaction,
  options?: SendOptions
): Promise<string> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => {
      if (transaction instanceof VersionedTransaction) {
        return connection.sendTransaction(transaction, {
          ...DEFAULT_SEND_OPTIONS,
          ...options
        });
      } else {
        return connection.sendTransaction(transaction, [], {
          ...DEFAULT_SEND_OPTIONS,
          ...options
        });
      }
    },
    'Send Transaction'
  );
}

// 带重试的交易确认
export async function confirmTransactionWithRetry(
  signature: string,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<any> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.confirmTransaction(signature, commitment),
    `Confirm Transaction: ${signature}`
  );
}

// 带重试的程序账户获取
export async function getProgramAccountsWithRetry(
  programId: PublicKey,
  config?: GetProgramAccountsConfig
): Promise<any[]> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.getProgramAccounts(programId, {
      commitment: DEFAULT_COMMITMENT,
      ...config
    }),
    `Get Program Accounts: ${programId.toBase58()}`
  );
}

// 带重试的最新区块哈希获取
export async function getLatestBlockhashWithRetry(
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<any> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.getLatestBlockhash(commitment),
    'Get Latest Blockhash'
  );
}

// 带重试的 Slot 获取
export async function getSlotWithRetry(
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<number> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.getSlot(commitment),
    'Get Slot'
  );
}

// 带重试的交易历史获取
export async function getSignaturesForAddressWithRetry(
  address: PublicKey,
  options?: {
    limit?: number;
    before?: string;
    until?: string;
    commitment?: Commitment;
  }
): Promise<any[]> {
  const connection = getRobustConnection();
  
  return robustRpcCall(
    () => connection.getSignaturesForAddress(address, {
      commitment: DEFAULT_COMMITMENT,
      ...options
    }),
    `Get Signatures: ${address.toBase58()}`
  );
}

// 批量操作工具
export class BatchRpcOperations {
  private operations: Array<() => Promise<any>> = [];
  private results: any[] = [];
  private readonly batchSize: number;
  private readonly delayBetweenBatches: number;

  constructor(batchSize: number = 5, delayBetweenBatches: number = 200) {
    this.batchSize = batchSize;
    this.delayBetweenBatches = delayBetweenBatches;
  }

  // 添加操作到批次
  addOperation(operation: () => Promise<any>): void {
    this.operations.push(operation);
  }

  // 执行所有批次操作
  async executeAll(): Promise<any[]> {
    this.results = [];
    
    for (let i = 0; i < this.operations.length; i += this.batchSize) {
      const batch = this.operations.slice(i, i + this.batchSize);
      
      console.log(`🔄 Executing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(this.operations.length / this.batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(operation => operation())
      );
      
      this.results.push(...batchResults);
      
      // 批次间延迟
      if (i + this.batchSize < this.operations.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }
    
    return this.results;
  }

  // 获取成功的结果
  getSuccessfulResults(): any[] {
    return this.results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  // 获取失败的结果
  getFailedResults(): any[] {
    return this.results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);
  }
}

// 导出常用的连接实例
export const defaultConnection = getRobustConnection();
