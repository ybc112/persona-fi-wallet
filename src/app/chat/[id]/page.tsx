'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { useJupiterMarketData } from '@/hooks/useJupiterMarketData';
import { Navbar } from '@/components/Navbar';
import AIPersonaChatInterface from '@/components/ai-persona/PersonaChatInterface';
import MarketInsightPanel from '@/components/ai-persona/MarketInsightPanel';
import PersonalizedRecommendations from '@/components/ai-persona/PersonalizedRecommendations';
import { Brain, TrendingUp, MessageCircle, BarChart3, Sparkles } from 'lucide-react';

interface AIPersona {
  id: number;
  name: string;
  personalityType: string;
  riskLevel: string;
  specialization: string;
  description: string;
  avatarUrl?: string;
  nftMintAddress?: string;
  isMinted: boolean;
  isListed: boolean;
  createdAt: string;
  creatorWallet: string;
}

export default function AIPersonaChatPage() {
  const params = useParams();
  const personaId = params.id as string;
  const { isConnected, login } = useWeb3Auth();
  const { publicKey } = useSolanaWallet();
  const { marketData, isLoading: marketLoading, error: marketError, refetch } = useJupiterMarketData();
  
  const [persona, setPersona] = useState<AIPersona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'market' | 'recommendations'>('chat');

  useEffect(() => {
    if (personaId) {
      fetchPersonaDetails();
    }
  }, [personaId]);

  const fetchPersonaDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/persona/${personaId}`);
      const result = await response.json();

      if (result.success) {
        setPersona(result.persona);
      } else {
        setError(result.error || 'Failed to load AI Persona');
      }
    } catch (error) {
      console.error('获取AI Persona详情失败:', error);
      setError('Failed to load AI Persona');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Brain className="w-16 h-16 text-purple-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">Use AI Persona</h1>
            <p className="text-purple-200 mb-8">Connect your wallet to chat with your AI investment advisor</p>
            <button
              onClick={login}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-purple-200">Loading AI Persona...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-4xl font-bold text-white mb-4">AI Persona Not Found</h1>
            <p className="text-purple-200 mb-8">{error || 'The requested AI Persona could not be found.'}</p>
            <a 
              href="/my-nfts"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Back to My NFTs
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col overflow-hidden">
        {/* 页面标题和AI Persona信息 */}
        <div className="mb-6">
          {/* AI Persona 头部信息卡片 */}
          <div className="persona-info-card rounded-2xl p-6 shadow-2xl mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {persona.avatarUrl ? (
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      className="persona-avatar w-20 h-20 rounded-2xl object-cover border-2 border-purple-400/60 shadow-lg"
                    />
                  ) : (
                    <div className="persona-avatar w-20 h-20 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-2xl flex items-center justify-center border-2 border-purple-400/60">
                      <Brain className="w-10 h-10 text-purple-400" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg status-indicator">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white truncate">
                      {persona.name}
                    </h1>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-200 border border-purple-500/30">
                        {persona.personalityType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm mb-2">
                    <span className="text-purple-200 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      {persona.specialization}
                    </span>
                    <span className="text-purple-200 flex items-center gap-1">
                      <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                      {persona.riskLevel.charAt(0).toUpperCase() + persona.riskLevel.slice(1)} Risk
                    </span>
                  </div>
                  <p className="text-purple-300 text-sm leading-relaxed line-clamp-2">
                    {persona.description}
                  </p>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 min-w-[200px]">
                  <div className="text-sm text-purple-300 mb-2 font-medium">Market Status</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${marketLoading ? 'bg-yellow-400' : marketError ? 'bg-red-400' : 'bg-green-400'}`}></div>
                    <span className="text-white text-sm font-medium">
                      {marketLoading ? 'Loading...' : marketError ? 'Offline' : 'Live Data'}
                    </span>
                  </div>
                  {marketData && (
                    <div className="text-xs text-purple-300">
                      Last update: {new Date(marketData.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 标签页导航 */}
          <div className="flex flex-wrap gap-2 bg-black/30 backdrop-blur-sm rounded-xl p-2 border border-purple-500/30 shadow-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`tab-button flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'chat'
                  ? 'active bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 scale-105'
                  : 'text-purple-200 hover:text-white hover:bg-purple-600/20 hover:scale-105'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">AI Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`tab-button flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'market'
                  ? 'active bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 scale-105'
                  : 'text-purple-200 hover:text-white hover:bg-blue-600/20 hover:scale-105'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Market Insights</span>
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`tab-button flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'recommendations'
                  ? 'active bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/25 scale-105'
                  : 'text-purple-200 hover:text-white hover:bg-green-600/20 hover:scale-105'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Recommendations</span>
            </button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* 左侧：主要内容 */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            {activeTab === 'chat' && (
              <AIPersonaChatInterface
                personaId={persona.id}
                personaName={persona.name}
                personalityType={persona.personalityType}
                avatarUrl={persona.avatarUrl}
                marketData={marketData}
                className="flex-1 min-h-0"
              />
            )}

            {activeTab === 'market' && (
              <MarketInsightPanel
                marketData={marketData}
                isLoading={marketLoading}
                error={marketError}
                onRefresh={refetch}
                persona={persona}
                className="flex-1 min-h-0 overflow-y-auto"
              />
            )}

            {activeTab === 'recommendations' && (
              <PersonalizedRecommendations
                persona={persona}
                marketData={marketData}
                className="flex-1 min-h-0 overflow-y-auto"
              />
            )}
          </div>

          {/* 右侧：侧边栏 */}
          <div className="lg:col-span-1 space-y-4 sticky top-6 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
            {/* AI Persona 状态卡片 */}
            <div className="sidebar-card bg-gradient-to-br from-black/30 to-purple-900/20 backdrop-blur-sm rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                AI Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 text-sm">Training Level</span>
                  <span className="text-white font-medium">Advanced</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 text-sm">Accuracy Rate</span>
                  <span className="text-green-400 font-medium">94.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 text-sm">Total Consultations</span>
                  <span className="text-white font-medium">1,247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 text-sm">Success Rate</span>
                  <span className="text-green-400 font-medium">87.5%</span>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="sidebar-card bg-gradient-to-br from-black/30 to-blue-900/20 backdrop-blur-sm rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>

              <div className="space-y-2">
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all transform hover:scale-105 text-sm shadow-md">
                  Get Market Analysis
                </button>
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all transform hover:scale-105 text-sm shadow-md">
                  Portfolio Review
                </button>
                <button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-all transform hover:scale-105 text-sm shadow-md">
                  Risk Assessment
                </button>
                <button className="w-full bg-black/30 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white py-2.5 px-4 rounded-lg font-medium transition-all text-sm hover:bg-purple-600/20">
                  Export Chat History
                </button>
              </div>
            </div>

            {/* 市场快照 */}
            {marketData && (
              <div className="sidebar-card bg-gradient-to-br from-black/30 to-green-900/20 backdrop-blur-sm rounded-xl p-5 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Market Snapshot
                </h3>

                <div className="space-y-3">
                  {marketData.prices && Object.entries(marketData.prices).slice(0, 3).map(([token, data]: [string, any]) => (
                    <div key={token} className="flex justify-between items-center">
                      <span className="text-purple-300 text-sm">{data.symbol || 'Token'}</span>
                      <div className="text-right">
                        <div className="text-white font-medium text-sm">${data.price?.toFixed(4) || 'N/A'}</div>
                        <div className={`text-xs ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.change24h >= 0 ? '+' : ''}{data.change24h?.toFixed(2) || '0'}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300 text-sm">Market Sentiment</span>
                    <span className={`text-sm font-medium ${
                      marketData.marketSentiment === 'bullish' ? 'text-green-400' :
                      marketData.marketSentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {marketData.marketSentiment || 'Neutral'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 最近活动 */}
            <div className="sidebar-card bg-gradient-to-br from-black/30 to-indigo-900/20 backdrop-blur-sm rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <div>
                    <div className="text-white text-sm">Market analysis completed</div>
                    <div className="text-purple-300 text-xs">2 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <div className="text-white text-sm">New recommendation generated</div>
                    <div className="text-purple-300 text-xs">5 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                  <div>
                    <div className="text-white text-sm">Portfolio updated</div>
                    <div className="text-purple-300 text-xs">1 hour ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
