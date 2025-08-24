'use client';

import React, { useState } from 'react';
import { JupiterMarketDashboard } from '@/components/JupiterMarketDashboard';

export default function TestJupiterPage() {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const handleAIAnalysis = async (prompt: string) => {
    try {
      setIsAnalyzing(true);
      setAiAnalysis('');

      console.log('发送AI分析请求:', prompt);

      const response = await fetch('/api/ai/jupiter-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: prompt,
          persona: {
            name: 'Jupiter AI',
            personalityType: '专业型',
            riskLevel: '中等风险',
            specialization: 'Solana DeFi交换'
          },
          includeMarketData: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAiAnalysis(data.analysis);
        console.log('AI分析成功:', data);
      } else {
        setAiAnalysis(`分析失败: ${data.error}`);
        console.error('AI分析失败:', data.error);
      }
    } catch (error: any) {
      console.error('AI分析请求错误:', error);
      setAiAnalysis(`请求失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const testJupiterAPI = async () => {
    try {
      setIsAnalyzing(true);
      console.log('开始测试Jupiter API...');

      const response = await fetch('/api/test-jupiter');
      const data = await response.json();

      setTestResults(data);
      setDebugInfo({
        timestamp: new Date().toLocaleString(),
        apiStatus: data.success ? '✅ 正常' : '❌ 异常',
        tests: data.tests
      });

      console.log('Jupiter API测试结果:', data);
    } catch (error: any) {
      console.error('Jupiter API测试失败:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const debugMarketData = async () => {
    try {
      setIsAnalyzing(true);
      console.log('开始调试市场数据流...');

      const response = await fetch('/api/debug-market-data');
      const data = await response.json();

      setTestResults(data);
      setDebugInfo({
        timestamp: new Date().toLocaleString(),
        apiStatus: data.success ? '✅ 调试完成' : '❌ 调试失败',
        debug: data.debug
      });

      console.log('市场数据调试结果:', data);
    } catch (error: any) {
      console.error('市场数据调试失败:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickAnalysis = async (type: string) => {
    try {
      setIsAnalyzing(true);
      setAiAnalysis('');

      const response = await fetch(`/api/ai/jupiter-analysis?type=${type}`);
      const data = await response.json();

      if (data.success) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis(`分析失败: ${data.error}`);
      }
    } catch (error: any) {
      console.error('快速分析错误:', error);
      setAiAnalysis(`请求失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🚀 Jupiter API 测试页面
          </h1>
          <p className="text-xl text-purple-200">
            基于Jupiter聚合器的实时Solana生态数据和AI分析
          </p>
        </div>

        {/* Jupiter市场数据面板 */}
        <div className="mb-8">
          <JupiterMarketDashboard onAIAnalysis={handleAIAnalysis} />
        </div>

        {/* API测试和快速分析 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🔧 API测试 & 🤖 AI分析</h2>

          {/* API测试按钮 */}
          <div className="mb-6">
            <button
              onClick={testJupiterAPI}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 transition-all mr-4"
            >
              🧪 测试Jupiter API
            </button>
            <button
              onClick={debugMarketData}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 disabled:opacity-50 transition-all mr-4"
            >
              🔍 调试数据流
            </button>
            {debugInfo && (
              <span className="text-sm text-green-300">
                {debugInfo.apiStatus} - {debugInfo.timestamp}
              </span>
            )}
          </div>

          {/* 快速分析按钮 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleQuickAnalysis('overview')}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              📊 市场概况
            </button>
            <button
              onClick={() => handleQuickAnalysis('sentiment')}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all"
            >
              💭 市场情绪
            </button>
            <button
              onClick={() => handleQuickAnalysis('opportunities')}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all"
            >
              💡 投资机会
            </button>
          </div>
        </div>

        {/* Jupiter API测试结果 */}
        {testResults && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">🧪 Jupiter API测试结果</h2>
            <div className="bg-black/30 rounded-lg p-4">
              <pre className="text-white whitespace-pre-wrap font-mono text-sm">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* AI分析结果 */}
        {(aiAnalysis || isAnalyzing) && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🧠 AI分析结果</h2>
            
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3 text-white">AI正在分析中...</span>
              </div>
            ) : (
              <div className="bg-black/30 rounded-lg p-4">
                <pre className="text-white whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {aiAnalysis}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 功能说明 */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">✨ 功能特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-200">
            <div>
              <h3 className="font-semibold text-white mb-2">🔄 实时数据</h3>
              <ul className="space-y-1 text-sm">
                <li>• Jupiter聚合器实时价格</li>
                <li>• 市场情绪分析</li>
                <li>• 热门代币追踪</li>
                <li>• 交易量监控</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🤖 AI分析</h3>
              <ul className="space-y-1 text-sm">
                <li>• 智能市场分析</li>
                <li>• 个性化投资建议</li>
                <li>• 风险评估</li>
                <li>• 交换策略推荐</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🔗 Jupiter集成</h3>
              <ul className="space-y-1 text-sm">
                <li>• 免费API使用</li>
                <li>• 交换报价获取</li>
                <li>• 代币信息查询</li>
                <li>• 路由优化</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">📊 数据可视化</h3>
              <ul className="space-y-1 text-sm">
                <li>• 价格变化展示</li>
                <li>• 市场情绪指标</li>
                <li>• 交易量图表</li>
                <li>• 实时更新</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 技术栈信息 */}
        <div className="mt-6 text-center text-purple-300 text-sm">
          <p>
            技术栈: Jupiter API + Solana Web3.js + Next.js + DeepSeek AI + TypeScript
          </p>
          <p className="mt-1">
            数据来源: Jupiter聚合器 (lite-api.jup.ag) - 完全免费使用
          </p>
        </div>
      </div>
    </div>
  );
}
