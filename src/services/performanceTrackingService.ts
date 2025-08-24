// 注意：这个服务只能在服务端使用（API路由中），不能在客户端组件中直接导入
import Database from '@/lib/database';
import { AIPerformanceData, PerformanceOverview, TimeFrame } from '@/types/performance';

class PerformanceTrackingService {
  
  // 获取排行榜数据 - 使用真实的交易性能数据
  static async getLeaderboard(timeframe: TimeFrame = TimeFrame.WEEK): Promise<AIPerformanceData[]> {
    try {
      console.log('🏆 获取排行榜数据，时间框架:', timeframe);
      
      // 首先更新排名
      await Database.updatePerformanceRanks();
      
      // 构建时间条件
      const timeCondition = this.buildTimeCondition(timeframe);
      
      // 查询真实的AI性能数据
      const query = `
        SELECT 
          aps.persona_id,
          ap.name,
          ap.personality_type,
          ap.avatar_url,
          ap.created_at,
          u.wallet_address as creator_wallet,
          
          -- 真实性能数据
          COALESCE(aps.cumulative_return_percentage, 0) as total_return,
          COALESCE(aps.total_volume_sol, 0) as total_volume,
          COALESCE(aps.total_trades, 0) as total_trades,
          COALESCE(
            CASE 
              WHEN aps.total_trades > 0 
              THEN (aps.total_winning_trades::DECIMAL / aps.total_trades * 100)
              ELSE 0 
            END, 0
          ) as win_rate,
          
          -- 排名数据
          COALESCE(aps.current_rank, 999) as rank,
          COALESCE(aps.rank_change, 0) as rank_change,
          
          -- 计算平均交易规模
          CASE 
            WHEN aps.total_trades > 0 
            THEN ROUND(aps.total_volume_sol / aps.total_trades, 2)
            ELSE 0 
          END as avg_trade_size,
          
          -- 风险指标
          COALESCE(aps.max_drawdown_percentage, 0) as max_drawdown,
          COALESCE(aps.sharpe_ratio, 0) as sharpe_ratio,
          
          -- 时间数据
          COALESCE(aps.last_trade_at, ap.created_at) as last_trade_at,
          
          -- 验证状态（基于交易量和收益）
          (aps.total_volume_sol > 50 AND aps.cumulative_return_percentage > 10) as is_verified,
          
          -- 训练会话数量作为活跃度指标
          COALESCE(ts.session_count, 0) as training_sessions
          
        FROM ai_personas ap
        INNER JOIN users u ON ap.creator_id = u.id
        INNER JOIN ai_performance_summary aps ON ap.id = aps.persona_id
        LEFT JOIN (
          SELECT 
            persona_id,
            COUNT(*) as session_count
          FROM ai_training_sessions 
          ${timeCondition ? `WHERE created_at >= NOW() - INTERVAL '${this.getIntervalString(timeframe)}'` : ''}
          GROUP BY persona_id
        ) ts ON ap.id = ts.persona_id
        
        WHERE ap.is_minted = true
          AND ap.id IS NOT NULL
          AND aps.persona_id IS NOT NULL
          AND aps.total_trades > 0
        ${timeCondition ? `AND ap.created_at >= NOW() - INTERVAL '${this.getIntervalString(timeframe)}'` : ''}
        
        ORDER BY 
          aps.current_rank ASC NULLS LAST,
          aps.cumulative_return_percentage DESC,
          aps.total_volume_sol DESC
        LIMIT 20
      `;
      
      const result = await Database.query(query);
      
      // 转换数据格式并验证数据完整性
      const leaderboardData: AIPerformanceData[] = result.rows
        .filter(row => this.validateRowData(row)) // 过滤无效数据
        .map((row, index) => ({
          persona_id: row.persona_id,
          name: row.name || 'Unknown AI',
          personality_type: row.personality_type || 'unknown',
          creator_wallet: this.formatWalletAddress(row.creator_wallet),
          avatar_url: row.avatar_url || null,
          
          total_return: Math.round((row.total_return || 0) * 100) / 100,
          total_volume: Math.round((row.total_volume || 0) * 100) / 100,
          total_trades: row.total_trades || 0,
          win_rate: Math.round((row.win_rate || 0) * 100) / 100,
          
          rank: row.rank || (index + 1),
          rank_change: row.rank_change || 0,
          
          avg_trade_size: row.avg_trade_size || 0,
          max_drawdown: Math.round((row.max_drawdown || 0) * 100) / 100,
          sharpe_ratio: row.sharpe_ratio || 0,
          
          created_at: row.created_at,
          last_trade_at: row.last_trade_at,
          
          is_verified: row.is_verified || false
        }));
      
      console.log(`✅ 成功获取${leaderboardData.length}个AI性能数据`);
      return leaderboardData;
      
    } catch (error) {
      console.error('❌ 获取排行榜数据失败:', error);
      throw error; // 抛出错误而不是返回备用数据
    }
  }
  
  // 获取性能概览统计
  static async getPerformanceOverview(timeframe: TimeFrame = TimeFrame.WEEK): Promise<PerformanceOverview> {
    try {
      const leaderboardData = await this.getLeaderboard(timeframe);
      
      if (leaderboardData.length === 0) {
        return {
          avg_win_rate: 0,
          avg_performance: 0,
          total_volume: 0,
          active_ais: 0
        };
      }
      
      const overview: PerformanceOverview = {
        avg_win_rate: leaderboardData.reduce((sum, ai) => sum + ai.win_rate, 0) / leaderboardData.length,
        avg_performance: leaderboardData.reduce((sum, ai) => sum + ai.total_return, 0) / leaderboardData.length,
        total_volume: leaderboardData.reduce((sum, ai) => sum + ai.total_volume, 0),
        active_ais: leaderboardData.length
      };
      
      return overview;
    } catch (error) {
      console.error('❌ 获取性能概览失败:', error);
      throw error; // 抛出错误而不是返回硬编码数据
    }
  }
  
  // 根据时间框架构建查询条件
  private static buildTimeCondition(timeframe: TimeFrame): string {
    switch (timeframe) {
      case TimeFrame.DAY:
        return "created_at >= NOW() - INTERVAL '1 day'";
      case TimeFrame.WEEK:
        return "created_at >= NOW() - INTERVAL '7 days'";
      case TimeFrame.MONTH:
        return "created_at >= NOW() - INTERVAL '30 days'";
      case TimeFrame.ALL:
      default:
        return '';
    }
  }
  
  // 获取时间间隔字符串
  private static getIntervalString(timeframe: TimeFrame): string {
    switch (timeframe) {
      case TimeFrame.DAY:
        return '1 day';
      case TimeFrame.WEEK:
        return '7 days';
      case TimeFrame.MONTH:
        return '30 days';
      case TimeFrame.ALL:
      default:
        return '1000 years'; // 实际上是全部时间
    }
  }
  
  // 验证行数据的完整性
  private static validateRowData(row: any): boolean {
    return (
      row.persona_id && 
      typeof row.persona_id === 'number' &&
      row.name && 
      typeof row.name === 'string' &&
      row.name.trim().length > 0
    );
  }

  // 格式化钱包地址
  private static formatWalletAddress(address: string): string {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  // 获取个性类型的显示名称
  static getPersonalityDisplayName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'defi-expert': 'DeFi Expert',
      'meme-hunter': 'Meme Hunter',
      'conservative': 'Conservative',
      'aggressive-trader': 'Aggressive Trader', 
      'nft-specialist': 'NFT Specialist',
      'gamefi-pro': 'GameFi Pro'
    };
    return typeMap[type] || type;
  }
  
  // 获取个性类型的图标
  static getPersonalityEmoji(type: string): string {
    const emojiMap: { [key: string]: string } = {
      'defi-expert': '🏦',
      'meme-hunter': '🚀',
      'conservative': '🛡️',
      'aggressive-trader': '🔥',
      'nft-specialist': '🎨',
      'gamefi-pro': '🎮'
    };
    return emojiMap[type] || '🤖';
  }
  
}

export default PerformanceTrackingService;