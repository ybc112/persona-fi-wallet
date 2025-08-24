import { Connection } from '@solana/web3.js';

// RPC 端点配置
const RPC_ENDPOINTS = [
  'https://api.devnet.solana.com',
  'https://devnet.helius-rpc.com/?api-key=demo',
  'https://rpc.ankr.com/solana_devnet',
];

// 连接池管理
class ConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private currentEndpointIndex = 0;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 100; // 减少到100ms，更合理的间隔
  private readonly MAX_CONCURRENT_REQUESTS = 5; // 限制并发请求数
  private activeRequests = 0;

  // 获取下一个可用的 RPC 端点
  getNextRpcEndpoint(): string {
    const endpoint = RPC_ENDPOINTS[this.currentEndpointIndex];
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    return endpoint;
  }

  // 创建或获取连接
  getConnection(endpoint?: string): Connection {
    const rpcUrl = endpoint || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || this.getNextRpcEndpoint();

    if (!this.connections.has(rpcUrl)) {
      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        wsEndpoint: undefined, // 禁用 WebSocket 以减少连接数
      });
      this.connections.set(rpcUrl, connection);
    }

    return this.connections.get(rpcUrl)!;
  }

  // 请求节流函数
  async throttleRequest(): Promise<void> {
    // 等待并发请求数量降下来
    while (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.activeRequests++;
  }

  // 请求完成后调用
  requestCompleted(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }
}

// 全局连接池实例
const connectionPool = new ConnectionPool();

// 向后兼容的函数
export function getNextRpcEndpoint(): string {
  return connectionPool.getNextRpcEndpoint();
}

export function createRobustConnection(): Connection {
  return connectionPool.getConnection();
}

export async function throttleRequest(): Promise<void> {
  return connectionPool.throttleRequest();
}

// 错误类型定义
interface RetryableError extends Error {
  code?: string | number;
  status?: number;
}

// 检查错误是否可重试
function isRetryableError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;
  const errorStatus = error.status;

  // 429 错误 - 速率限制
  if (errorMessage.includes('429') || errorMessage.includes('too many requests')) {
    return true;
  }

  // 网络相关错误
  if (errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')) {
    return true;
  }

  // HTTP 状态码错误
  if (errorStatus === 429 || errorStatus === 503 || errorStatus === 504) {
    return true;
  }

  // RPC 错误码
  if (errorCode === -32005 || errorCode === -32603) { // Node behind, Internal error
    return true;
  }

  return false;
}

// 计算退避延迟
function calculateBackoffDelay(attempt: number, baseDelay: number, isRateLimit: boolean): number {
  if (isRateLimit) {
    // 对于 429 错误，使用更长的退避时间
    return Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, 30000);
  } else {
    // 对于其他错误，使用较短的退避时间
    return Math.min(baseDelay * Math.pow(1.5, attempt) + Math.random() * 500, 10000);
  }
}

// 改进的重试机制
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 5, // 增加重试次数
    baseDelay = 1000,
    onRetry,
    onError
  } = options;

  let lastError: Error;
  let requestStarted = false;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 只在第一次尝试或重试时进行节流
      if (!requestStarted) {
        await connectionPool.throttleRequest();
        requestStarted = true;
      }

      const result = await operation();

      // 请求成功，标记完成
      connectionPool.requestCompleted();
      return result;

    } catch (error: any) {
      lastError = error;

      // 标记请求完成（即使失败）
      if (requestStarted) {
        connectionPool.requestCompleted();
        requestStarted = false;
      }

      // 调用错误回调
      if (onError) {
        onError(error);
      }

      // 检查是否可重试
      if (!isRetryableError(error)) {
        console.warn(`Non-retryable error encountered:`, error.message);
        throw error;
      }

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries - 1) {
        console.error(`All ${maxRetries} retry attempts failed. Last error:`, error.message);
        throw error;
      }

      // 计算退避延迟
      const isRateLimit = error.message?.includes('429') || error.message?.includes('Too many requests');
      const waitTime = calculateBackoffDelay(attempt, baseDelay, isRateLimit);

      // 调用重试回调
      if (onRetry) {
        onRetry(attempt + 1, error, waitTime);
      }

      console.log(`Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}. Retrying in ${waitTime}ms...`);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

// 带有自动重试的 RPC 调用包装器
export async function robustRpcCall<T>(
  operation: () => Promise<T>,
  operationName: string = 'RPC Call'
): Promise<T> {
  return withRetry(operation, {
    maxRetries: 5,
    baseDelay: 1000,
    onRetry: (attempt, error, delay) => {
      console.log(`🔄 ${operationName} - Retry ${attempt}/5: ${error.message} (waiting ${delay}ms)`);
    },
    onError: (error) => {
      console.warn(`⚠️ ${operationName} failed:`, error.message);
    }
  });
}

// 获取带有重试机制的连接
export function getRobustConnection(): Connection {
  return connectionPool.getConnection();
}

// 连接健康检查
export async function checkConnectionHealth(connection: Connection): Promise<boolean> {
  try {
    await robustRpcCall(
      () => connection.getSlot(),
      'Health Check'
    );
    return true;
  } catch (error) {
    console.error('Connection health check failed:', error);
    return false;
  }
}

// 获取最佳连接（基于延迟）
export async function getBestConnection(): Promise<Connection> {
  const connections = RPC_ENDPOINTS.map(endpoint => connectionPool.getConnection(endpoint));

  // 简单的延迟测试
  const healthChecks = connections.map(async (conn, index) => {
    const start = Date.now();
    try {
      await conn.getSlot();
      const latency = Date.now() - start;
      return { connection: conn, latency, index };
    } catch (error) {
      return { connection: conn, latency: Infinity, index };
    }
  });

  const results = await Promise.all(healthChecks);
  const best = results.reduce((prev, current) =>
    current.latency < prev.latency ? current : prev
  );

  console.log(`🚀 Selected RPC endpoint ${best.index} with ${best.latency}ms latency`);
  return best.connection;
}

// 导出连接池实例以供高级用户使用
export { connectionPool };
