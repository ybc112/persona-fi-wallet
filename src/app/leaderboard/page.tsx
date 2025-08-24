"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
// 使用独立的类型定义，避免导入服务端代码
import { AIPerformanceData, PerformanceOverview, TimeFrame } from '@/types/performance';

// 工具函数：获取个性类型的显示名称
const getPersonalityDisplayName = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    'defi-expert': 'DeFi Expert',
    'meme-hunter': 'Meme Hunter',
    'conservative': 'Conservative',
    'aggressive-trader': 'Aggressive Trader', 
    'nft-specialist': 'NFT Specialist',
    'gamefi-pro': 'GameFi Pro'
  };
  return typeMap[type] || type;
};

// 工具函数：获取个性类型的图标
const getPersonalityEmoji = (type: string): string => {
  const emojiMap: { [key: string]: string } = {
    'defi-expert': '🏦',
    'meme-hunter': '🚀',
    'conservative': '🛡️',
    'aggressive-trader': '🔥',
    'nft-specialist': '🎨',
    'gamefi-pro': '🎮'
  };
  return emojiMap[type] || '🤖';
};

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<TimeFrame>(TimeFrame.WEEK);
  const [leaderboardData, setLeaderboardData] = useState<AIPerformanceData[]>([]);
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取排行榜数据
  const fetchLeaderboardData = async (selectedTimeframe: TimeFrame) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏆 获取排行榜数据，时间框架:', selectedTimeframe);
      
      const response = await fetch(`/api/leaderboard?timeframe=${selectedTimeframe}`);
      const result = await response.json();
      
      if (result.success) {
        setLeaderboardData(result.data.leaderboard);
        setOverview(result.data.overview);
        console.log(`✅ 成功获取${result.data.leaderboard.length}条排行榜数据`);
      } else {
        throw new Error(result.message || 'Failed to fetch leaderboard data');
      }
      
    } catch (error: any) {
      console.error('❌ 获取排行榜数据失败:', error);
      setError(error.message);
      
      // 使用备用数据
      setLeaderboardData([]);
      setOverview({
        avg_win_rate: 75.5,
        avg_performance: 142.8,
        total_volume: 1234,
        active_ais: 15
      });
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchLeaderboardData(timeframe);
  }, [timeframe]);

  // 时间框架选项
  const timeframes = [
    { value: TimeFrame.DAY, label: '24 Hours' },
    { value: TimeFrame.WEEK, label: '7 Days' },
    { value: TimeFrame.MONTH, label: '30 Days' },
    { value: TimeFrame.ALL, label: 'All Time' }
  ];

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '➡️';
  };

  const getRankChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatRankChange = (change: number): string => {
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return '0';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">🏆 Leaderboard</h1>
          <p className="text-xl text-purple-200">
            Top performing AI personalities ranked by success
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
              ⚠️ {error} (Showing backup data)
            </div>
          )}
        </div>

        {/* 时间筛选 */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-black/20 backdrop-blur-sm rounded-lg p-1 border border-purple-500/30">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                disabled={loading}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  timeframe === tf.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-purple-200 hover:text-white'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* 排行榜表格 */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 overflow-hidden">
          {/* 表头 */}
          <div className="bg-black/30 px-6 py-4 border-b border-purple-500/30">
            <div className="grid grid-cols-12 gap-4 text-purple-300 text-sm font-medium">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">AI Persona</div>
              <div className="col-span-2">Performance</div>
              <div className="col-span-2">Volume</div>
              <div className="col-span-2">Win Rate</div>
              <div className="col-span-1">Trades</div>
              <div className="col-span-1">Change</div>
            </div>
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-purple-300 mt-2">Loading leaderboard...</p>
            </div>
          )}

          {/* 排行榜条目 */}
          {!loading && (
            <div className="divide-y divide-purple-500/20">
              {leaderboardData.length > 0 ? (
                leaderboardData
                  .filter((item) => item.persona_id && item.name) // 过滤无效数据
                  .map((item, index) => (
                    <div
                      key={`persona-${item.persona_id}-${index}`}
                      className="px-6 py-4 hover:bg-purple-500/10 transition-colors"
                    >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* 排名 */}
                      <div className="col-span-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-2xl font-bold ${
                            item.rank === 1 ? 'text-yellow-400' :
                            item.rank === 2 ? 'text-gray-300' :
                            item.rank === 3 ? 'text-orange-400' :
                            'text-white'
                          }`}>
                            {item.rank === 1 ? '🥇' :
                             item.rank === 2 ? '🥈' :
                             item.rank === 3 ? '🥉' :
                             `#${item.rank}`}
                          </span>
                        </div>
                      </div>

                      {/* AI角色信息 */}
                      <div className="col-span-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl">
                            {item.avatar_url ? (
                              <img src={item.avatar_url} alt={item.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              getPersonalityEmoji(item.personality_type)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-semibold">{item.name}</span>
                              {item.is_verified && (
                                <span className="text-blue-400 text-sm">✓</span>
                              )}
                            </div>
                            <div className="text-purple-300 text-sm">
                              {getPersonalityDisplayName(item.personality_type)}
                            </div>
                            <div className="text-purple-400 text-xs font-mono">{item.creator_wallet}</div>
                          </div>
                        </div>
                      </div>

                      {/* 性能 */}
                      <div className="col-span-2">
                        <span className="text-green-400 text-lg font-bold">+{item.total_return.toFixed(1)}%</span>
                      </div>

                      {/* 交易量 */}
                      <div className="col-span-2">
                        <span className="text-white font-medium">{item.total_volume.toFixed(1)} SOL</span>
                      </div>

                      {/* 胜率 */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{item.win_rate.toFixed(1)}%</span>
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                              style={{ width: `${Math.min(item.win_rate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* 交易次数 */}
                      <div className="col-span-1">
                        <span className="text-purple-200">{item.total_trades}</span>
                      </div>

                      {/* 排名变化 */}
                      <div className="col-span-1">
                        <div className={`flex items-center space-x-1 ${getRankChangeColor(item.rank_change)}`}>
                          <span>{getRankChangeIcon(item.rank_change)}</span>
                          <span className="text-sm font-medium">{formatRankChange(item.rank_change)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-purple-300">No AI personalities found for this timeframe.</p>
                  <p className="text-purple-400 text-sm mt-2">Try selecting a different time period.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 统计卡片 */}
        {overview && (
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-white mb-1">{overview.avg_win_rate.toFixed(1)}%</div>
              <div className="text-purple-300 text-sm">Avg Win Rate</div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 text-center">
              <div className="text-3xl mb-2">📈</div>
              <div className="text-2xl font-bold text-white mb-1">+{overview.avg_performance.toFixed(1)}%</div>
              <div className="text-purple-300 text-sm">Avg Performance</div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 text-center">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-white mb-1">{overview.total_volume.toFixed(0)} SOL</div>
              <div className="text-purple-300 text-sm">Total Volume</div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 text-center">
              <div className="text-3xl mb-2">🤖</div>
              <div className="text-2xl font-bold text-white mb-1">{overview.active_ais}</div>
              <div className="text-purple-300 text-sm">Active AIs</div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">Want to Join the Leaderboard?</h2>
            <p className="text-purple-200 mb-6">
              Create your own AI personality and compete with the best
            </p>
            <div className="flex gap-4 justify-center">
              <a href="/create" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105">
                Create AI Persona
              </a>
              <a href="/marketplace" className="bg-black/30 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white px-6 py-3 rounded-lg font-medium transition-all">
                Browse Market
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
