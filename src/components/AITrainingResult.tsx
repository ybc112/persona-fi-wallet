"use client";

import React from 'react';
import { CheckCircle, TrendingUp, Shield, Brain, Target, Star } from 'lucide-react';

interface TrainingResultProps {
  personalityType: string;
  aiName: string;
  trainingData: any[];
  onContinue: () => void;
}

interface AICapability {
  name: string;
  score: number;
  description: string;
  icon: React.ReactNode;
}

export default function AITrainingResult({ 
  personalityType, 
  aiName, 
  trainingData, 
  onContinue 
}: TrainingResultProps) {
  
  // 根据训练数据计算AI能力评分
  const calculateCapabilities = (): AICapability[] => {
    // 这里可以根据实际的训练数据进行智能分析
    // 现在先用模拟数据展示效果
    
    const baseScores = {
      strategy: Math.floor(Math.random() * 20) + 75, // 75-95
      riskControl: Math.floor(Math.random() * 25) + 70, // 70-95
      marketAnalysis: Math.floor(Math.random() * 20) + 80, // 80-100
      adaptability: Math.floor(Math.random() * 15) + 75, // 75-90
      consistency: Math.floor(Math.random() * 20) + 75, // 75-95
    };

    return [
      {
        name: "策略完整性",
        score: baseScores.strategy,
        description: "投资策略的系统性和逻辑性",
        icon: <Target className="w-5 h-5" />
      },
      {
        name: "风险控制",
        score: baseScores.riskControl,
        description: "风险识别和管理能力",
        icon: <Shield className="w-5 h-5" />
      },
      {
        name: "市场分析",
        score: baseScores.marketAnalysis,
        description: "市场趋势判断和分析能力",
        icon: <TrendingUp className="w-5 h-5" />
      },
      {
        name: "适应能力",
        score: baseScores.adaptability,
        description: "对不同市场环境的适应性",
        icon: <Brain className="w-5 h-5" />
      },
      {
        name: "决策一致性",
        score: baseScores.consistency,
        description: "投资决策的稳定性和一致性",
        icon: <CheckCircle className="w-5 h-5" />
      }
    ];
  };

  const capabilities = calculateCapabilities();
  const overallScore = Math.round(capabilities.reduce((sum, cap) => sum + cap.score, 0) / capabilities.length);
  
  const getGradeInfo = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-yellow-400', bg: 'bg-yellow-500/20', desc: '卓越级' };
    if (score >= 85) return { grade: 'A+', color: 'text-green-400', bg: 'bg-green-500/20', desc: '优秀级' };
    if (score >= 80) return { grade: 'A', color: 'text-blue-400', bg: 'bg-blue-500/20', desc: '良好级' };
    if (score >= 75) return { grade: 'B+', color: 'text-purple-400', bg: 'bg-purple-500/20', desc: '合格级' };
    return { grade: 'B', color: 'text-gray-400', bg: 'bg-gray-500/20', desc: '基础级' };
  };

  const gradeInfo = getGradeInfo(overallScore);

  const getPersonalityDescription = (type: string) => {
    const descriptions: { [key: string]: string } = {
      'aggressive-trader': '激进型交易专家，擅长捕捉高风险高收益机会',
      'conservative-advisor': '稳健型投资顾问，专注长期价值投资',
      'defi-expert': 'DeFi协议专家，深度理解去中心化金融',
      'meme-hunter': 'Meme币猎手，敏锐捕捉市场热点',
      'nft-specialist': 'NFT投资专家，精通数字艺术品市场',
      'gamefi-pro': 'GameFi专业分析师，游戏金融领域权威'
    };
    return descriptions[type] || '专业投资顾问';
  };

  return (
    <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl border border-green-500/30 p-8">
      {/* 头部 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
          <h2 className="text-3xl font-bold text-white">训练完成！</h2>
        </div>
        <p className="text-green-200 text-lg">
          你的专属AI投资顾问已经准备就绪
        </p>
      </div>

      {/* AI信息卡片 */}
      <div className="bg-black/30 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${gradeInfo.bg} ${gradeInfo.color}`}>
            {gradeInfo.grade}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{aiName}</h3>
            <p className="text-green-200">{getPersonalityDescription(personalityType)}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">综合评分: {overallScore}/100 ({gradeInfo.desc})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 能力评估 */}
      <div className="mb-8">
        <h4 className="text-xl font-bold text-white mb-6 text-center">🎯 AI能力评估报告</h4>
        <div className="grid md:grid-cols-2 gap-4">
          {capabilities.map((capability, index) => (
            <div key={index} className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-purple-400">
                  {capability.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{capability.name}</span>
                    <span className="text-purple-300 font-bold">{capability.score}/100</span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${capability.score}%` }}
                />
              </div>
              <p className="text-purple-200 text-xs">{capability.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 训练统计 */}
      <div className="bg-purple-900/20 rounded-lg p-6 mb-8 border border-purple-500/30">
        <h4 className="text-lg font-bold text-white mb-4">📊 训练统计</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">4</div>
            <div className="text-sm text-purple-200">训练阶段</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">{trainingData.filter(msg => msg.role === 'user').length}</div>
            <div className="text-sm text-purple-200">回答问题</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">100%</div>
            <div className="text-sm text-purple-200">完成度</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">{gradeInfo.grade}</div>
            <div className="text-sm text-purple-200">最终评级</div>
          </div>
        </div>
      </div>

      {/* 下一步提示 */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-6 border border-green-500/30">
        <h4 className="text-lg font-bold text-white mb-3">🚀 下一步操作</h4>
        <div className="space-y-2 text-green-200 text-sm mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>生成专属AI头像</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>铸造AI角色NFT</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>上架到市场开始赚钱</span>
          </div>
        </div>
        
        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          继续创建 AI 形象 →
        </button>
      </div>
    </div>
  );
}
