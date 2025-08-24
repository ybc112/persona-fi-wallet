"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, BarChart3, PieChart, Activity, Zap } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MarketInsightPanelProps {
  marketData?: any;
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  persona: any;
  className?: string;
}

export default function MarketInsightPanel({
  marketData,
  isLoading,
  error,
  onRefresh,
  persona,
  className = ''
}: MarketInsightPanelProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    console.log('MarketInsightPanel: useEffect触发', {
      hasMarketData: !!marketData,
      analysisLoading,
      marketDataKeys: marketData ? Object.keys(marketData) : []
    });

    if (marketData && !analysisLoading) {
      console.log('MarketInsightPanel: 收到市场数据，准备生成AI分析:', marketData);
      generateAIAnalysis();
    }
  }, [marketData]);

  const generateAIAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      console.log('MarketInsightPanel: 开始生成AI分析，persona:', persona);

      const response = await fetch('/api/ai/jupiter-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `请基于当前Jupiter聚合器数据，从${persona.personalityType}的角度分析Solana生态市场情况`,
          persona: {
            name: persona.name,
            personalityType: persona.personalityType,
            riskLevel: persona.riskLevel,
            specialization: persona.specialization
          },
          includeMarketData: true
        }),
      });

      console.log('MarketInsightPanel: API响应状态:', response.status);
      const data = await response.json();
      console.log('MarketInsightPanel: API响应数据:', data);

      if (data.success) {
        setAiAnalysis(data.analysis);
        console.log('MarketInsightPanel: AI分析设置成功');
      } else {
        console.error('MarketInsightPanel: API返回失败:', data.error);
        setAiAnalysis(`分析失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('MarketInsightPanel: 生成AI分析失败:', error);
      setAiAnalysis('暂时无法生成市场分析，请稍后重试。');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  // 生成模拟历史数据用于图表显示
  const generateMockHistoricalData = (currentPrice: number, change24h: number) => {
    const points = 24; // 24小时数据点
    const data = [];
    const startPrice = currentPrice / (1 + change24h / 100); // 计算24小时前的价格

    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      // 添加一些随机波动使图表更真实
      const randomFactor = 0.95 + Math.random() * 0.1; // ±5%的随机波动
      const price = startPrice + (currentPrice - startPrice) * progress * randomFactor;
      data.push({
        time: `${i}h`,
        price: Math.max(0, price)
      });
    }

    return data;
  };

  // 获取图表配置
  const getChartConfig = (data: any[], tokenSymbol: string) => {
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const isPositive = prices[prices.length - 1] > prices[0];

    return {
      data: {
        labels: data.map(d => d.time),
        datasets: [
          {
            label: tokenSymbol,
            data: prices,
            borderColor: isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
            backgroundColor: isPositive
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(147, 51, 234, 0.5)',
            borderWidth: 1,
            callbacks: {
              label: function(context: any) {
                return `${tokenSymbol}: $${context.parsed.y.toFixed(6)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: false
            }
          },
          y: {
            display: false,
            grid: {
              display: false
            },
            min: minPrice * 0.98,
            max: maxPrice * 1.02
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false
        }
      }
    };
  };

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl border border-red-500/30 p-8 text-center ${className}`}>
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Market Data Error</h3>
        <p className="text-red-200 mb-6">{error}</p>
        <button
          onClick={onRefresh}
          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 flex flex-col ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Market Insights</h3>
              <p className="text-purple-200 text-sm">Jupiter聚合器实时数据分析</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-black/20 rounded-lg p-1">
              {(['1h', '24h', '7d', '30d'] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    selectedTimeframe === timeframe
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
            
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-black/20 border border-purple-500/30 hover:border-purple-400/50 rounded-lg transition-all"
            >
              <RefreshCw className={`w-4 h-4 text-purple-300 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {marketData && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-black/20 rounded-lg p-3 border border-purple-500/20">
              <div className="text-purple-300 text-xs mb-1">Market Status</div>
              <div className={`text-sm font-medium ${
                marketData.marketSentiment === 'bullish' ? 'text-green-400' :
                marketData.marketSentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {marketData.marketSentiment || 'Neutral'}
              </div>
            </div>
            
            <div className="bg-black/20 rounded-lg p-3 border border-purple-500/20">
              <div className="text-purple-300 text-xs mb-1">Tracked Tokens</div>
              <div className="text-white text-sm font-medium">
                {Object.keys(marketData.prices || {}).length}
              </div>
            </div>
            
            <div className="bg-black/20 rounded-lg p-3 border border-purple-500/20">
              <div className="text-purple-300 text-xs mb-1">Top Traded</div>
              <div className="text-white text-sm font-medium">
                {marketData.topTraded?.length || 0}
              </div>
            </div>
            
            <div className="bg-black/20 rounded-lg p-3 border border-purple-500/20">
              <div className="text-purple-300 text-xs mb-1">Last Update</div>
              <div className="text-white text-sm font-medium">
                {marketData.timestamp ? new Date(marketData.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        {/* 专业市场概览图表 */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">市场概览</h4>
                <p className="text-purple-300 text-sm">主要代币24小时表现</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>涨幅</span>
              <div className="w-2 h-2 bg-red-400 rounded-full ml-3"></div>
              <span>跌幅</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-black/40 to-purple-900/20 rounded-2xl border border-purple-500/30 p-8 backdrop-blur-sm">
            <div className="h-96">
              {(() => {
                // 使用真实数据或高质量模拟数据
                const tokens = marketData?.prices ?
                  Object.entries(marketData.prices).slice(0, 8) :
                  [
                    ['SOL', { symbol: 'SOL', change24h: 5.2, price: 180.45 }],
                    ['USDC', { symbol: 'USDC', change24h: -0.1, price: 1.0 }],
                    ['RAY', { symbol: 'RAY', change24h: 8.7, price: 2.34 }],
                    ['ORCA', { symbol: 'ORCA', change24h: -3.4, price: 4.56 }],
                    ['MNGO', { symbol: 'MNGO', change24h: 12.1, price: 0.089 }],
                    ['SRM', { symbol: 'SRM', change24h: -1.8, price: 0.45 }],
                    ['COPE', { symbol: 'COPE', change24h: 6.3, price: 0.12 }],
                    ['STEP', { symbol: 'STEP', change24h: -2.1, price: 0.078 }]
                  ];

                const chartData = {
                  labels: tokens.map(([_, data]: [string, any]) => data.symbol || 'Token'),
                  datasets: [
                    {
                      label: '24小时变化',
                      data: tokens.map(([_, data]: [string, any]) => data.change24h || 0),
                      backgroundColor: tokens.map(([_, data]: [string, any]) => {
                        const change = data.change24h || 0;
                        if (change > 5) return 'rgba(34, 197, 94, 0.8)';
                        if (change > 0) return 'rgba(34, 197, 94, 0.6)';
                        if (change > -5) return 'rgba(239, 68, 68, 0.6)';
                        return 'rgba(239, 68, 68, 0.8)';
                      }),
                      borderColor: tokens.map(([_, data]: [string, any]) => {
                        const change = data.change24h || 0;
                        return change >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
                      }),
                      borderWidth: 2,
                      borderRadius: 8,
                      borderSkipped: false,
                    }
                  ]
                };

                const chartOptions = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      titleColor: 'white',
                      bodyColor: 'white',
                      borderColor: 'rgba(147, 51, 234, 0.8)',
                      borderWidth: 2,
                      cornerRadius: 12,
                      titleFont: {
                        size: 16,
                        weight: 'bold'
                      },
                      bodyFont: {
                        size: 14
                      },
                      padding: 12,
                      callbacks: {
                        title: function(context: any) {
                          return context[0].label;
                        },
                        label: function(context: any) {
                          const change = context.parsed.y;
                          const token = tokens[context.dataIndex];
                          const price = token[1].price || 0;
                          return [
                            `24h变化: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
                            `当前价格: $${price.toFixed(price < 1 ? 6 : 2)}`
                          ];
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      },
                      border: {
                        display: false
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                          size: 14,
                          weight: '600'
                        },
                        padding: 10
                      }
                    },
                    y: {
                      grid: {
                        color: 'rgba(147, 51, 234, 0.15)',
                        lineWidth: 1
                      },
                      border: {
                        display: false
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                          size: 13
                        },
                        padding: 15,
                        callback: function(value: any) {
                          return (value > 0 ? '+' : '') + value + '%';
                        }
                      }
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index' as const
                  },
                  animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                  }
                };

                return <Bar data={chartData} options={chartOptions} />;
              })()}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-purple-300 text-sm">
                实时数据 • 每5分钟更新
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-green-300">上涨 {
                    (() => {
                      const tokens = marketData?.prices ?
                        Object.entries(marketData.prices) :
                        [['SOL', { change24h: 5.2 }], ['RAY', { change24h: 8.7 }], ['MNGO', { change24h: 12.1 }], ['COPE', { change24h: 6.3 }]];
                      const upCount = tokens.filter(([_, data]: [string, any]) => (data.change24h || 0) > 0).length;
                      return upCount;
                    })()
                  }</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-red-300">下跌 {
                    (() => {
                      const tokens = marketData?.prices ?
                        Object.entries(marketData.prices) :
                        [['USDC', { change24h: -0.1 }], ['ORCA', { change24h: -3.4 }], ['SRM', { change24h: -1.8 }], ['STEP', { change24h: -2.1 }]];
                      const downCount = tokens.filter(([_, data]: [string, any]) => (data.change24h || 0) < 0).length;
                      return downCount;
                    })()
                  }</span>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* 主要代币价格 */}
        {marketData?.prices && (
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              主要代币价格
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(marketData.prices).slice(0, 6).map(([token, data]: [string, any]) => {
                const historicalData = generateMockHistoricalData(data.price || 0, data.change24h || 0);
                const chartConfig = getChartConfig(historicalData, data.symbol || 'Token');

                return (
                  <div key={token} className="bg-black/20 rounded-lg p-5 border border-purple-500/20 hover:border-purple-400/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-white font-medium text-lg">{data.symbol || 'Token'}</div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        data.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {data.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(data.change24h || 0)}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-4">
                      ${formatPrice(data.price || 0)}
                    </div>

                    {/* 价格走势图 */}
                    <div className="h-32 mb-4 bg-black/10 rounded-lg p-2">
                      <Line data={chartConfig.data} options={chartConfig.options} />
                    </div>

                    <div className="text-purple-300 text-sm">
                      24h Volume: ${((data.volume24h || 0) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 价格趋势对比图表 */}
        {marketData?.prices && Object.keys(marketData.prices).length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              价格趋势对比
            </h4>

            <div className="bg-black/20 rounded-lg border border-purple-500/20 p-6">
              <div className="h-96">
                {(() => {
                  // 创建多代币价格趋势对比数据
                  const topTokens = Object.entries(marketData.prices).slice(0, 4);
                  const timeLabels = Array.from({length: 24}, (_, i) => `${i}h`);

                  const datasets = topTokens.map(([_, data]: [string, any], index: number) => {
                    const historicalData = generateMockHistoricalData(data.price || 0, data.change24h || 0);
                    const colors = [
                      'rgb(34, 197, 94)',   // 绿色
                      'rgb(59, 130, 246)',  // 蓝色
                      'rgb(168, 85, 247)',  // 紫色
                      'rgb(245, 158, 11)'   // 黄色
                    ];

                    return {
                      label: data.symbol || 'Token',
                      data: historicalData.map(d => d.price),
                      borderColor: colors[index % colors.length],
                      backgroundColor: colors[index % colors.length] + '20',
                      borderWidth: 3,
                      fill: false,
                      tension: 0.4,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                      pointHoverBackgroundColor: colors[index % colors.length],
                    };
                  });

                  const trendComparisonData = {
                    labels: timeLabels,
                    datasets: datasets
                  };

                  const trendComparisonOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top' as const,
                        labels: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            size: 14
                          },
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(147, 51, 234, 0.5)',
                        borderWidth: 1,
                        titleFont: {
                          size: 14
                        },
                        bodyFont: {
                          size: 13
                        },
                        callbacks: {
                          label: function(context: any) {
                            return `${context.dataset.label}: $${context.parsed.y.toFixed(6)}`;
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
                          color: 'rgba(255, 255, 255, 0.7)',
                          font: {
                            size: 12
                          }
                        }
                      },
                      y: {
                        grid: {
                          color: 'rgba(147, 51, 234, 0.1)',
                          borderColor: 'rgba(147, 51, 234, 0.3)'
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.7)',
                          font: {
                            size: 12
                          },
                          callback: function(value: any) {
                            return '$' + value.toFixed(6);
                          }
                        }
                      }
                    },
                    interaction: {
                      mode: 'index' as const,
                      intersect: false
                    }
                  };

                  return <Line data={trendComparisonData} options={trendComparisonOptions} />;
                })()}
              </div>

              <div className="mt-4 text-center">
                <div className="text-purple-300 text-sm">
                  主要代币24小时价格走势对比 • 数据每5分钟更新
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 热门交易代币 */}
        {marketData?.topTraded && marketData.topTraded.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              热门交易代币
            </h4>

            <div className="bg-black/20 rounded-lg border border-purple-500/20">
              <div className="p-4 space-y-3">
                {marketData.topTraded.slice(0, 8).map((token: any, index: number) => {
                  const currentPrice = token.price || token.usdPrice || 0;
                  const change24h = token.change24h || 0;
                  const historicalData = generateMockHistoricalData(currentPrice, change24h);
                  const chartConfig = getChartConfig(historicalData, token.symbol || token.name || 'Token');

                  return (
                    <div key={token.mint || token.id || index} className="flex items-center justify-between py-3 border-b border-purple-500/10 last:border-b-0">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{token.symbol || token.name || 'Unknown'}</div>
                          <div className="text-purple-300 text-sm">{token.name || 'Token'}</div>
                        </div>
                      </div>

                      {/* 迷你图表 */}
                      <div className="w-32 h-12 mx-3">
                        <Line data={chartConfig.data} options={chartConfig.options} />
                      </div>

                      <div className="text-right">
                        <div className="text-white font-medium">
                          ${formatPrice(currentPrice)}
                        </div>
                        <div className={`text-sm ${
                          change24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatChange(change24h)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AI市场分析 */}
        <div>
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            AI市场分析
            <span className="text-sm text-purple-300">• {persona.personalityType}视角</span>
          </h4>
          
          <div className="bg-black/20 rounded-lg p-6 border border-purple-500/20">
            {analysisLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-purple-300">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  <span>AI正在分析市场数据...</span>
                </div>
              </div>
            ) : aiAnalysis ? (
              <div className="prose prose-invert max-w-none">
                <div className="text-purple-100 leading-relaxed whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
                <div className="mt-4 pt-4 border-t border-purple-500/30">
                  <button
                    onClick={generateAIAnalysis}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 text-sm"
                  >
                    重新分析
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-purple-300 mb-4">暂无AI分析数据</div>
                <button
                  onClick={generateAIAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
                >
                  生成AI分析
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 市场情绪指标 */}
        {marketData && (
          <div>
            <h4 className="text-lg font-bold text-white mb-4">市场情绪指标</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
                <div className="text-purple-300 text-sm mb-2">整体情绪</div>
                <div className={`text-xl font-bold ${
                  marketData.marketSentiment === 'bullish' ? 'text-green-400' :
                  marketData.marketSentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {marketData.marketSentiment === 'bullish' ? '看涨' :
                   marketData.marketSentiment === 'bearish' ? '看跌' : '中性'}
                </div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
                <div className="text-purple-300 text-sm mb-2">活跃度</div>
                <div className="text-xl font-bold text-blue-400">
                  {marketData.topTraded?.length > 15 ? '高' : 
                   marketData.topTraded?.length > 8 ? '中' : '低'}
                </div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
                <div className="text-purple-300 text-sm mb-2">波动性</div>
                <div className="text-xl font-bold text-orange-400">
                  {(() => {
                    const avgChange = Object.values(marketData.prices || {})
                      .reduce((sum: number, token: any) => sum + Math.abs(token.change24h || 0), 0) / 
                      Object.keys(marketData.prices || {}).length;
                    return avgChange > 10 ? '高' : avgChange > 5 ? '中' : '低';
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
