'use client';

import React, { useState } from 'react';
import { useJupiterMarketData, useJupiterSwap } from '../hooks/useJupiterMarketData';
import { MarketDataAggregator } from '../services/marketDataAggregator';
import { JupiterAPI } from '../services/jupiterAPI';
import { BarChart3, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface JupiterMarketDashboardProps {
  onAIAnalysis?: (prompt: string) => void;
}

export function JupiterMarketDashboard({ onAIAnalysis }: JupiterMarketDashboardProps) {
  const { marketData, isLoading, error, lastUpdate, refetch } = useJupiterMarketData();
  const { getQuote, isSwapping } = useJupiterSwap();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState<string>('0.1');

  const handleAIAnalysis = async (query: string) => {
    if (!marketData || !onAIAnalysis) return;
    
    const prompt = MarketDataAggregator.generateAnalysisPrompt(
      marketData,
      query,
      { 
        name: 'Jupiter AI', 
        personalityType: '专业型', 
        riskLevel: '中等风险', 
        specialization: 'DeFi交换' 
      }
    );
    
    onAIAnalysis(prompt);
  };

  const handleGetQuote = async () => {
    if (!selectedToken) return;
    
    const amount = parseFloat(swapAmount) * 1e9; // 转换为lamports
    const quote = await getQuote({
      inputMint: JupiterAPI.TOKENS.SOL,
      outputMint: selectedToken,
      amount: Math.floor(amount),
      slippageBps: 50
    });
    
    if (quote) {
      alert(`交换报价：${swapAmount} SOL ≈ ${(quote.outAmount / 1e6).toFixed(4)} ${JupiterAPI.getTokenSymbol(selectedToken)}`);
    }
  };

  if (isLoading && !marketData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">加载Jupiter市场数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">⚠️</div>
          <div className="ml-2">
            <h3 className="text-red-800 font-medium">数据获取失败</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={refetch}
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 标题和状态 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🚀 Jupiter市场数据</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-purple-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            实时连接
          </div>
          {lastUpdate && (
            <div className="text-sm text-purple-300">
              更新时间: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={refetch}
            disabled={isLoading}
            className="px-3 py-1 bg-purple-600/50 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50 transition-all"
          >
            {isLoading ? '更新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 专业市场概览图表 */}
      {marketData?.prices && Object.keys(marketData.prices).length > 0 && (
        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            市场概览图表
            <span className="text-sm font-normal text-purple-300 ml-auto">
              实时数据来源：Jupiter聚合器
            </span>
          </h3>

          <div className="h-96 mb-4">
            {(() => {
              // 创建专业的市场概览图表数据
              const tokens = Object.entries(marketData.prices).slice(0, 8);
              const upCount = tokens.filter(([_, data]: [string, any]) => (data.change24h || 0) >= 0).length;
              const downCount = tokens.length - upCount;

              const chartData = {
                labels: tokens.map(([_, data]: [string, any]) => data.symbol || 'Token'),
                datasets: [
                  {
                    label: '24h 价格变化 (%)',
                    data: tokens.map(([_, data]: [string, any]) => data.change24h || 0),
                    backgroundColor: tokens.map(([_, data]: [string, any]) => {
                      const change = data.change24h || 0;
                      if (change >= 5) return 'rgba(34, 197, 94, 0.8)';
                      if (change >= 0) return 'rgba(34, 197, 94, 0.6)';
                      if (change >= -5) return 'rgba(239, 68, 68, 0.6)';
                      return 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderColor: tokens.map(([_, data]: [string, any]) =>
                      (data.change24h || 0) >= 0
                        ? 'rgb(34, 197, 94)'
                        : 'rgb(239, 68, 68)'
                    ),
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                  }
                ]
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart' as const,
                },
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(147, 51, 234, 0.5)',
                    borderWidth: 1,
                    titleFont: {
                      size: 16,
                      weight: 'bold' as const
                    },
                    bodyFont: {
                      size: 14
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                      title: function(context: any) {
                        const tokenData = tokens[context[0].dataIndex];
                        return tokenData[1].symbol || 'Token';
                      },
                      label: function(context: any) {
                        const tokenData = tokens[context.dataIndex];
                        const price = tokenData[1].price || 0;
                        const change = context.parsed.y;
                        return [
                          `24h变化: ${change.toFixed(2)}%`,
                          `当前价格: $${price.toFixed(4)}`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    grid: {
                      color: 'rgba(147, 51, 234, 0.1)',
                      borderColor: 'rgba(147, 51, 234, 0.3)'
                    },
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.9)',
                      font: {
                        size: 14,
                        weight: 'bold' as const
                      }
                    }
                  },
                  y: {
                    grid: {
                      color: 'rgba(147, 51, 234, 0.1)',
                      borderColor: 'rgba(147, 51, 234, 0.3)'
                    },
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.9)',
                      font: {
                        size: 14
                      },
                      callback: function(value: any) {
                        return value + '%';
                      }
                    }
                  }
                }
              };

              return <Bar data={chartData} options={chartOptions} />;
            })()}
          </div>

          {/* 图表统计信息 */}
          <div className="flex justify-center space-x-8 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400">
                上涨: {Object.entries(marketData.prices).filter(([_, data]: [string, any]) => (data.change24h || 0) >= 0).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-red-400">
                下跌: {Object.entries(marketData.prices).filter(([_, data]: [string, any]) => (data.change24h || 0) < 0).length}
              </span>
            </div>
            <div className="text-purple-300">
              数据更新频率: 每30秒
            </div>
          </div>
        </div>
      )}

      {/* 市场概况 */}
      {marketData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              市场情绪
            </h3>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded-full mr-3 animate-pulse"
                style={{ backgroundColor: MarketDataAggregator.getMarketColor(marketData.marketSentiment) }}
              ></div>
              <span className="capitalize font-medium text-white text-lg">
                {marketData.marketSentiment === 'bullish' ? '🚀 看涨' :
                 marketData.marketSentiment === 'bearish' ? '📉 看跌' : '⚖️ 中性'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              验证代币
            </h3>
            <div className="text-3xl font-bold text-blue-400">
              {marketData.verified?.length || Object.keys(marketData.prices || {}).length}
            </div>
            <div className="text-sm text-purple-300 mt-1">
              已验证项目
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              热门交易
            </h3>
            <div className="text-3xl font-bold text-green-400">
              {marketData.topTraded?.length || Object.keys(marketData.prices || {}).length}
            </div>
            <div className="text-sm text-purple-300 mt-1">
              活跃代币
            </div>
          </div>
        </div>
      )}

      {/* 主要代币价格 */}
      {marketData?.prices && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-green-400" />
            主要代币价格
            <span className="text-sm font-normal text-purple-300 ml-auto">
              实时更新
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(marketData.prices).map(([mint, data]: [string, any]) => (
              <div key={mint} className="bg-black/20 rounded-lg border border-purple-500/20 p-4 hover:border-purple-400/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-white text-lg">{JupiterAPI.getTokenSymbol(mint)}</span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                    data.change24h >= 0
                      ? 'text-green-400 bg-green-400/10'
                      : 'text-red-400 bg-red-400/10'
                  }`}>
                    {MarketDataAggregator.formatPriceChange(data.change24h)}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">
                  ${MarketDataAggregator.formatNumber(data.price)}
                </div>
                {data.volume24h > 0 && (
                  <div className="text-sm text-purple-300">
                    24h量: ${MarketDataAggregator.formatNumber(data.volume24h)}
                  </div>
                )}
                <div className="mt-2 h-1 bg-purple-900/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      data.change24h >= 0 ? 'bg-green-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(Math.abs(data.change24h || 0) * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 交换测试 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
          🔄 交换测试
          <span className="text-sm font-normal text-purple-300 ml-auto">
            Jupiter聚合器
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              交换数量 (SOL)
            </label>
            <input
              type="number"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400 focus:border-purple-400 focus:outline-none transition-all"
              placeholder="0.1"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              目标代币
            </label>
            <select
              value={selectedToken || ''}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg text-white focus:border-purple-400 focus:outline-none transition-all"
            >
              <option value="" className="bg-gray-800">选择代币</option>
              <option value={JupiterAPI.TOKENS.USDC} className="bg-gray-800">USDC</option>
              <option value={JupiterAPI.TOKENS.RAY} className="bg-gray-800">RAY</option>
              <option value={JupiterAPI.TOKENS.ORCA} className="bg-gray-800">ORCA</option>
              <option value={JupiterAPI.TOKENS.JUP} className="bg-gray-800">JUP</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGetQuote}
              disabled={!selectedToken || isSwapping || parseFloat(swapAmount) <= 0}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
            >
              {isSwapping ? '获取中...' : '🚀 获取报价'}
            </button>
          </div>
        </div>
      </div>

      {/* AI分析按钮 */}
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
        <h3 className="text-xl font-semibold mb-6 text-white flex items-center gap-3">
          🤖 AI市场分析
          <span className="text-sm font-normal text-purple-300 ml-auto">
            智能分析引擎
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAIAnalysis('当前Solana市场如何？')}
            className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-semibold text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="font-bold">市场概况分析</div>
                <div className="text-sm text-purple-200">整体市场趋势</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleAIAnalysis('现在适合投资哪些代币？')}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="font-bold">投资建议</div>
                <div className="text-sm text-blue-200">个性化推荐</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleAIAnalysis('Jupiter聚合器有什么优势？')}
            className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <div className="font-bold">交换策略</div>
                <div className="text-sm text-green-200">最优路径分析</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleAIAnalysis('当前市场风险如何？')}
            className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all font-semibold text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-bold">风险评估</div>
                <div className="text-sm text-orange-200">安全性分析</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
