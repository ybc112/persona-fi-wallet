"use client";

import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Shield, AlertTriangle, Star, RefreshCw, ArrowRight, Zap } from 'lucide-react';
import { useTradeExecution } from '@/hooks/useTradeExecution';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { JupiterAPI } from '@/services/jupiterAPI';
import TradeConfirmationModal from '@/components/TradeConfirmationModal';
import TradeStatusModal from '@/components/TradeStatusModal';

interface PersonalizedRecommendationsProps {
  persona: any;
  marketData?: any;
  className?: string;
}

interface Recommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'swap';
  token: string;
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: string;
  timeframe: string;
  action?: string;
}

export default function PersonalizedRecommendations({
  persona,
  marketData,
  className = ''
}: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'buy' | 'sell' | 'swap'>('all');
  
  // 交易执行相关状态
  const { isConnected } = useWeb3Auth();
  const {
    isLoading: isTradeLoading,
    isExecuting,
    confirmationData,
    result: tradeResult,
    error: tradeError,
    prepareTradeExecution,
    executeTrade,
    clearState,
    clearError,
    canExecute
  } = useTradeExecution();
  
  // 模态框状态
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentRecommendation, setCurrentRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (marketData && persona) {
      generateRecommendations();
    }
  }, [marketData, persona]);

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      
      // 基于AI Persona特性和市场数据生成推荐
      const mockRecommendations: Recommendation[] = [
        {
          id: '1',
          type: 'buy',
          token: 'SOL',
          confidence: 85,
          reasoning: `基于${persona.personalityType}的投资风格，SOL当前价格具有较好的入场机会。技术面显示支撑位稳固，且Solana生态持续发展。`,
          riskLevel: persona.riskLevel === '高风险' ? 'medium' : 'low',
          expectedReturn: '15-25%',
          timeframe: '1-3个月',
          action: 'Jupiter聚合器交换'
        },
        {
          id: '2',
          type: 'swap',
          token: 'USDC → RAY',
          confidence: 78,
          reasoning: `Raydium作为Solana生态的核心DEX，近期交易量增长显著。适合${persona.specialization}专业领域的投资策略。`,
          riskLevel: 'medium',
          expectedReturn: '20-35%',
          timeframe: '2-4周',
          action: '通过Jupiter执行交换'
        },
        {
          id: '3',
          type: 'hold',
          token: 'JUP',
          confidence: 92,
          reasoning: `Jupiter作为Solana最大的聚合器，具有长期价值。符合${persona.riskLevel}的持有策略。`,
          riskLevel: 'low',
          expectedReturn: '10-20%',
          timeframe: '3-6个月',
          action: '继续持有并定投'
        }
      ];

      // 根据市场数据调整推荐
      if (marketData?.marketSentiment === 'bearish') {
        mockRecommendations.push({
          id: '4',
          type: 'sell',
          token: '高风险代币',
          confidence: 70,
          reasoning: '当前市场情绪偏向看跌，建议减少高风险资产配置，保持现金流动性。',
          riskLevel: 'high',
          expectedReturn: '避免损失',
          timeframe: '立即执行',
          action: '部分止盈'
        });
      }

      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('生成推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.type === selectedCategory);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'high': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'sell': return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
      case 'hold': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'swap': return <RefreshCw className="w-4 h-4 text-purple-400" />;
      default: return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'buy': return '买入';
      case 'sell': return '卖出';
      case 'hold': return '持有';
      case 'swap': return '交换';
      default: return '未知';
    }
  };

  // 处理执行操作点击
  const handleExecuteAction = async (recommendation: Recommendation) => {
    if (!isConnected) {
      alert('请先连接钱包');
      return;
    }

    if (!canExecute) {
      alert('钱包未准备就绪，请检查连接状态');
      return;
    }

    // 清除之前的状态
    clearState();
    clearError();

    // 设置当前推荐
    setCurrentRecommendation(recommendation);

    // 根据推荐类型构建交易参数
    const tradeParams = buildTradeParams(recommendation);
    if (!tradeParams) {
      alert('暂不支持此类型的操作');
      return;
    }

    // 准备交易执行
    const confirmationData = await prepareTradeExecution(tradeParams);
    if (confirmationData) {
      setShowConfirmationModal(true);
    }
  };

  // 构建交易参数
  const buildTradeParams = (recommendation: Recommendation) => {
    switch (recommendation.type) {
      case 'buy':
        if (recommendation.token === 'SOL') {
          // 买入SOL - 使用USDC购买SOL
          return {
            inputMint: JupiterAPI.TOKENS.USDC,
            outputMint: JupiterAPI.TOKENS.SOL,
            amount: 10 * 1e6, // 10 USDC
            slippageBps: 50
          };
        }
        break;
        
      case 'swap':
        if (recommendation.token === 'USDC → RAY') {
          return {
            inputMint: JupiterAPI.TOKENS.USDC,
            outputMint: JupiterAPI.TOKENS.RAY,
            amount: 5 * 1e6, // 5 USDC
            slippageBps: 50
          };
        }
        break;
        
      case 'sell':
        // 可以添加卖出逻辑
        break;
        
      case 'hold':
        // 持有操作不需要交易
        alert('持有操作无需执行交易，建议继续观察市场');
        return null;
    }
    
    return null;
  };

  // 确认交易执行
  const handleConfirmTrade = async () => {
    if (!currentRecommendation) return;

    const tradeParams = buildTradeParams(currentRecommendation);
    if (!tradeParams) return;

    setShowConfirmationModal(false);
    
    const result = await executeTrade(tradeParams);
    
    // 显示结果
    setShowStatusModal(true);
  };

  // 关闭确认模态框
  const handleCloseConfirmation = () => {
    setShowConfirmationModal(false);
    setCurrentRecommendation(null);
    clearState();
  };

  // 关闭状态模态框
  const handleCloseStatus = () => {
    setShowStatusModal(false);
    setCurrentRecommendation(null);
    clearState();
  };

  // 重试交易
  const handleRetryTrade = () => {
    setShowStatusModal(false);
    if (currentRecommendation) {
      handleExecuteAction(currentRecommendation);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 flex flex-col ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">个性化推荐</h3>
              <p className="text-purple-200 text-sm">基于{persona.personalityType} • {persona.riskLevel}</p>
            </div>
          </div>
          
          <button
            onClick={generateRecommendations}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新推荐
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex space-x-1 bg-black/20 rounded-lg p-1">
          {[
            { key: 'all', label: '全部', icon: Target },
            { key: 'buy', label: '买入', icon: TrendingUp },
            { key: 'sell', label: '卖出', icon: TrendingUp },
            { key: 'swap', label: '交换', icon: RefreshCw }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                selectedCategory === key
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-purple-200 hover:text-white hover:bg-purple-600/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-purple-300">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span>AI正在生成个性化推荐...</span>
            </div>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-white mb-2">暂无推荐</h4>
            <p className="text-purple-300 mb-6">AI正在分析市场数据，稍后将为您生成个性化投资建议</p>
            <button
              onClick={generateRecommendations}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
            >
              生成推荐
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-black/20 rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      {getTypeIcon(rec.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-white">{getTypeLabel(rec.type)} {rec.token}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(rec.riskLevel)}`}>
                          {rec.riskLevel === 'low' ? '低风险' : rec.riskLevel === 'medium' ? '中风险' : '高风险'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-purple-300 text-sm">预期收益: {rec.expectedReturn}</span>
                        <span className="text-purple-300 text-sm">时间框架: {rec.timeframe}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium">{rec.confidence}%</span>
                    </div>
                    <div className="text-purple-300 text-sm">置信度</div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-purple-100 leading-relaxed">{rec.reasoning}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-purple-300">
                    <Zap className="w-4 h-4" />
                    <span>{rec.action}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleExecuteAction(rec)}
                    disabled={!isConnected || isTradeLoading || isExecuting}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isTradeLoading || isExecuting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {isTradeLoading ? '准备中...' : '执行中...'}
                      </>
                    ) : (
                      <>
                        执行操作
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* 置信度条 */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-300 text-sm">AI置信度</span>
                    <span className="text-white text-sm font-medium">{rec.confidence}%</span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${rec.confidence}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 风险提示 */}
        <div className="mt-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-4 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-yellow-300 font-medium mb-1">投资风险提示</h5>
              <p className="text-yellow-200 text-sm leading-relaxed">
                以上推荐基于AI分析生成，仅供参考。加密货币投资存在高风险，可能导致本金损失。
                请根据自身风险承受能力谨慎决策，建议咨询专业投资顾问。
              </p>
            </div>
          </div>
        </div>

        {/* 个性化设置 */}
        <div className="mt-6 bg-black/20 rounded-lg p-4 border border-purple-500/20">
          <h5 className="text-white font-medium mb-3">推荐设置</h5>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-purple-300 text-sm mb-1 block">风险偏好</label>
              <div className="text-white font-medium">{persona.riskLevel}</div>
            </div>
            <div>
              <label className="text-purple-300 text-sm mb-1 block">专业领域</label>
              <div className="text-white font-medium">{persona.specialization}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 交易确认模态框 */}
      <TradeConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmTrade}
        confirmationData={confirmationData}
        isExecuting={isExecuting}
        recommendation={currentRecommendation}
      />

      {/* 交易状态模态框 */}
      <TradeStatusModal
        isOpen={showStatusModal}
        onClose={handleCloseStatus}
        result={tradeResult}
        onRetry={handleRetryTrade}
      />
    </div>
  );
}
