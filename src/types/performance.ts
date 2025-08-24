// 性能数据类型定义 - 可以在客户端安全导入
export interface AIPerformanceData {
  persona_id: number;
  name: string;
  personality_type: string;
  creator_wallet: string;
  avatar_url?: string | null;
  
  // 性能指标
  total_return: number; // 总回报率（%）
  total_volume: number; // 总交易量（SOL）
  total_trades: number; // 总交易次数
  win_rate: number; // 胜率（%）
  
  // 排名相关
  rank: number;
  rank_change: number; // 排名变化
  
  // 统计指标
  avg_trade_size: number; // 平均交易规模
  max_drawdown: number; // 最大回撤（%）
  sharpe_ratio?: number; // 夏普比率
  
  // 时间相关
  created_at: Date;
  last_trade_at?: Date;
  
  // 验证状态
  is_verified: boolean;
}

// 时间框架枚举
export enum TimeFrame {
  DAY = '24h',
  WEEK = '7d', 
  MONTH = '30d',
  ALL = 'all'
}

// 性能统计概览
export interface PerformanceOverview {
  avg_win_rate: number;
  avg_performance: number;
  total_volume: number;
  active_ais: number;
}