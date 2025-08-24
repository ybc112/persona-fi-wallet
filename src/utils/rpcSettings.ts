// RPC 配置和设置管理

export interface RpcEndpointConfig {
  url: string;
  name: string;
  priority: number; // 优先级，数字越小优先级越高
  maxRetries: number;
  timeout: number;
  rateLimit: number; // 每秒最大请求数
}

// 预定义的 RPC 端点配置
export const RPC_ENDPOINTS_CONFIG: RpcEndpointConfig[] = [
  {
    url: 'https://api.devnet.solana.com',
    name: 'Solana Official Devnet',
    priority: 1,
    maxRetries: 5,
    timeout: 30000,
    rateLimit: 10, // 每秒10个请求
  },
  {
    url: 'https://devnet.helius-rpc.com/?api-key=demo',
    name: 'Helius Devnet (Demo)',
    priority: 2,
    maxRetries: 3,
    timeout: 20000,
    rateLimit: 5, // 演示密钥限制更严格
  },
  {
    url: 'https://rpc.ankr.com/solana_devnet',
    name: 'Ankr Devnet',
    priority: 3,
    maxRetries: 4,
    timeout: 25000,
    rateLimit: 8,
  },
];

// 重试策略配置
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterRange: number; // 随机延迟范围 (0-1)
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitterRange: 0.3,
};

// 针对 429 错误的特殊重试配置
export const RATE_LIMIT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 8,
  baseDelay: 2000,
  maxDelay: 60000,
  backoffFactor: 2.5,
  jitterRange: 0.5,
};

// 并发控制配置
export interface ConcurrencyConfig {
  maxConcurrentRequests: number;
  requestInterval: number; // 请求间最小间隔 (ms)
  burstLimit: number; // 突发请求限制
  burstWindow: number; // 突发窗口时间 (ms)
}

export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrentRequests: 5,
  requestInterval: 100,
  burstLimit: 10,
  burstWindow: 1000,
};

// 错误分类
export enum ErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// 错误分类函数
export function classifyError(error: any): ErrorType {
  const message = error.message?.toLowerCase() || '';
  const code = error.code;
  const status = error.status;

  // 429 错误
  if (message.includes('429') || message.includes('too many requests') || status === 429) {
    return ErrorType.RATE_LIMIT;
  }

  // 网络错误
  if (message.includes('network') || 
      message.includes('fetch') || 
      message.includes('connection') ||
      code === 'NETWORK_ERROR') {
    return ErrorType.NETWORK;
  }

  // 超时错误
  if (message.includes('timeout') || code === 'TIMEOUT') {
    return ErrorType.TIMEOUT;
  }

  // 服务器错误
  if (status >= 500 || code === -32603 || code === -32005) {
    return ErrorType.SERVER_ERROR;
  }

  // 客户端错误
  if (status >= 400 && status < 500) {
    return ErrorType.CLIENT_ERROR;
  }

  return ErrorType.UNKNOWN;
}

// 根据错误类型获取重试配置
export function getRetryConfigForError(errorType: ErrorType): RetryConfig {
  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      return RATE_LIMIT_RETRY_CONFIG;
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.SERVER_ERROR:
      return DEFAULT_RETRY_CONFIG;
    case ErrorType.CLIENT_ERROR:
    case ErrorType.UNKNOWN:
    default:
      return {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2, // 客户端错误和未知错误减少重试次数
      };
  }
}

// 性能监控配置
export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  errorsByType: Record<ErrorType, number>;
  endpointStats: Record<string, {
    requests: number;
    failures: number;
    averageLatency: number;
  }>;
}

// 创建空的性能指标
export function createEmptyMetrics(): PerformanceMetrics {
  return {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    errorsByType: {
      [ErrorType.RATE_LIMIT]: 0,
      [ErrorType.NETWORK]: 0,
      [ErrorType.TIMEOUT]: 0,
      [ErrorType.SERVER_ERROR]: 0,
      [ErrorType.CLIENT_ERROR]: 0,
      [ErrorType.UNKNOWN]: 0,
    },
    endpointStats: {},
  };
}

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 日志配置
export interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableMetrics: boolean;
  enableDetailedErrors: boolean;
}

export const DEFAULT_LOG_CONFIG: LogConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableMetrics: true,
  enableDetailedErrors: false,
};

// 开发环境配置
export const DEV_LOG_CONFIG: LogConfig = {
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableMetrics: true,
  enableDetailedErrors: true,
};

// 生产环境配置
export const PROD_LOG_CONFIG: LogConfig = {
  level: LogLevel.WARN,
  enableConsole: false,
  enableMetrics: true,
  enableDetailedErrors: false,
};

// 获取当前环境的日志配置
export function getLogConfig(): LogConfig {
  if (process.env.NODE_ENV === 'development') {
    return DEV_LOG_CONFIG;
  }
  return PROD_LOG_CONFIG;
}

// 断路器配置
export interface CircuitBreakerConfig {
  failureThreshold: number; // 失败阈值
  resetTimeout: number; // 重置超时时间 (ms)
  monitoringPeriod: number; // 监控周期 (ms)
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1分钟
  monitoringPeriod: 30000, // 30秒
};
