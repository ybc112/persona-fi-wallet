"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import AvatarGenerator from '@/components/AvatarGenerator';
import AITrainingChat from '@/components/AITrainingChat';
import NFTMintSuccessModal from '@/components/NFTMintSuccessModal';
// 移除不再需要的导入，因为使用Umi方式不需要前端处理交易
// import AITrainingResult from '@/components/AITrainingResult';

export default function CreateAIPage() {
  const { isConnected, user: userInfo, provider } = useWeb3Auth();
  const [step, setStep] = useState(1);
  const [aiData, setAiData] = useState({
    name: '',
    personality: '',
    riskLevel: 'moderate',
    specialization: '',
    description: '',
    avatarUrl: '',
    trainingComplete: false,
    nftMinted: false
  });

  const personalities = [
    { id: 'aggressive-trader', name: 'Aggressive Trader', emoji: '🔥', desc: 'High-risk, high-reward strategies' },
    { id: 'conservative-advisor', name: 'Conservative Advisor', emoji: '🛡️', desc: 'Safe, steady growth approach' },
    { id: 'defi-expert', name: 'DeFi Expert', emoji: '🌊', desc: 'Specialized in DeFi protocols' },
    { id: 'meme-hunter', name: 'Meme Hunter', emoji: '🚀', desc: 'Spots trending meme coins early' },
    { id: 'nft-specialist', name: 'NFT Specialist', emoji: '🎨', desc: 'Focuses on NFT investments' },
    { id: 'gamefi-pro', name: 'GameFi Pro', emoji: '🎮', desc: 'Gaming and metaverse tokens' }
  ];

  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [nftMintResult, setNftMintResult] = useState<any>(null);

  const handleAvatarGenerated = (imageUrl: string) => {
    setAiData(prev => ({ ...prev, avatarUrl: imageUrl }));
  };

  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [showTrainingResult, setShowTrainingResult] = useState(false);

  const handleCreateAI = async () => {
    if (!aiData.name || !aiData.personality || !aiData.avatarUrl || !aiData.trainingComplete) {
      alert('请完成所有必需步骤！');
      return;
    }

    if (!isConnected) {
      alert('请先连接钱包！');
      return;
    }

    // 获取真实的钱包地址
    let walletAddress = '';
    if (provider && userInfo) {
      try {
        // 从Web3Auth provider获取真实的Solana钱包地址
        const accounts = await provider.request({ method: "getAccounts" }) as string[];
        walletAddress = accounts[0];
      } catch (error) {
        console.error('获取钱包地址失败:', error);
        // 回退到模拟地址
        walletAddress = `0x${userInfo.email?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().padEnd(40, '0').slice(0, 40)}`;
      }
    } else {
      // 如果没有provider，使用默认地址
      walletAddress = '0x1234567890123456789012345678901234567890';
    }

    console.log('使用钱包地址:', walletAddress);

    setIsCreating(true);
    try {
      // 第一步：创建AI角色
      console.log('🎭 创建AI角色...');
      const createResponse = await fetch('/api/ai/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          name: aiData.name,
          personalityType: aiData.personality,
          riskLevel: aiData.riskLevel,
          specialization: aiData.specialization,
          avatarUrl: aiData.avatarUrl,
          trainingData: trainingData
        }),
      });

      const createResult = await createResponse.json();

      if (!createResult.success) {
        throw new Error(createResult.error || 'AI创建失败');
      }

      console.log('✅ AI角色创建成功:', createResult.persona);

      // 第二步：铸造NFT
      if (createResult.needsNFTMinting) {
        console.log('🎨 开始铸造NFT...');
        const mintResult = await handleNFTMinting(walletAddress, createResult.persona.id);

        // 设置NFT铸造结果并显示成功弹窗
        setNftMintResult({
          name: aiData.name,
          mintAddress: mintResult.mintAddress,
          transactionSignature: mintResult.transactionSignature,
          avatarUrl: aiData.avatarUrl,
          metadataUri: mintResult.metadataUri || ''
        });
        setShowSuccessModal(true);
      }

      setAiData(prev => ({ ...prev, nftMinted: true }));

    } catch (error: any) {
      console.error('创建AI失败:', error);
      alert(`创建失败：${error.message || '未知错误'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNFTMinting = async (walletAddress: string, personaId: number) => {
    try {
      console.log('🎨 开始使用Umi铸造NFT...');

      // 使用新的Umi铸造API - 服务器端完成所有铸造逻辑
      console.log('📋 发送铸造请求到服务器...');
      const mintResponse = await fetch('/api/nft/mint-umi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          personaId: personaId,
        }),
      });

      const mintResult = await mintResponse.json();

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'NFT铸造失败');
      }

      console.log('✅ NFT铸造成功!', {
        mintAddress: mintResult.mintAddress,
        transactionSignature: mintResult.transactionSignature
      });

      return {
        success: true,
        mintAddress: mintResult.mintAddress,
        transactionSignature: mintResult.transactionSignature,
        explorerUrl: mintResult.explorerUrl,
        nftInfo: mintResult.nftInfo,
        metadataUri: mintResult.metadataUri || '',
        confirmed: true
      };

    } catch (error: any) {
      console.error('❌ NFT铸造失败:', error);

      // 根据错误类型显示不同的提示
      let errorMessage = error.message;
      if (error.message?.includes('insufficient funds')) {
        errorMessage = '服务器余额不足，请联系管理员';
      } else if (error.message?.includes('timeout')) {
        errorMessage = '网络超时，请重试';
      } else if (error.message?.includes('已经铸造')) {
        errorMessage = '该AI角色已经铸造过NFT了';
      }

      throw new Error(errorMessage);
    }
  };

  const handleNext = () => {
    // 第1步验证是否选择了性格
    if (step === 1 && !aiData.personality) {
      alert('🎭 请先选择一个AI性格类型！');
      return;
    }

    // 第2步验证是否完成训练
    if (step === 2 && !aiData.trainingComplete) {
      alert('🧠 请先完成AI个性化训练！');
      return;
    }

    // 第3步验证是否生成了头像
    if (step === 3 && !aiData.avatarUrl) {
      alert('🎨 请先生成AI头像！');
      return;
    }

    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-purple-200 mb-8">You need to connect your wallet to create AI personalities</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 进度条 */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-2">
            {[
              { num: 1, title: '选择AI类型', icon: '🎭' },
              { num: 2, title: '个性化训练', icon: '🧠' },
              { num: 3, title: '生成AI形象', icon: '🎨' },
              { num: 4, title: '铸造NFT', icon: '💎' },
              { num: 5, title: '上架市场', icon: '🏪' }
            ].map((stepInfo, index) => (
              <div key={stepInfo.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    step >= stepInfo.num
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {step > stepInfo.num ? '✓' : stepInfo.icon}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${
                      step >= stepInfo.num ? 'text-purple-200' : 'text-gray-400'
                    }`}>
                      {stepInfo.title}
                    </p>
                  </div>
                </div>
                {index < 4 && (
                  <div className={`w-8 h-1 mx-2 transition-all ${
                    step > stepInfo.num ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* 当前步骤提示 */}
          <div className="text-center mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <p className="text-purple-200 font-medium text-lg">
              {step === 1 && '🎭 选择你想要创建的AI投资顾问类型'}
              {step === 2 && '🧠 与AI对话，训练你的专属投资偏好'}
              {step === 3 && '🎨 AI自动生成专属头像形象'}
              {step === 4 && '💎 将AI角色铸造成NFT'}
              {step === 5 && '🏪 设置价格，上架到市场'}
            </p>
          </div>
        </div>

        {/* Step 1: 选择AI个性 */}
        {step === 1 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Choose AI Personality</h2>
            <p className="text-purple-200 text-center mb-8">
              Select the type of AI investment advisor you want to create
            </p>

            {/* AI名称输入 */}
            <div className="mb-8">
              <label className="block text-purple-200 mb-2 text-center text-lg font-medium">AI Name</label>
              <div className="max-w-md mx-auto">
                <input
                  type="text"
                  value={aiData.name}
                  onChange={(e) => setAiData({...aiData, name: e.target.value})}
                  placeholder="给你的AI起个名字"
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none text-center"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalities.map((personality) => (
                <div
                  key={personality.id}
                  onClick={() => setAiData({...aiData, personality: personality.id})}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    aiData.personality === personality.id
                      ? 'border-purple-400 bg-purple-500/20'
                      : 'border-purple-500/30 bg-black/20 hover:border-purple-400/50'
                  }`}
                >
                  <div className="text-4xl mb-4 text-center">{personality.emoji}</div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">{personality.name}</h3>
                  <p className="text-purple-200 text-sm text-center">{personality.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: AI个性化训练 */}
        {step === 2 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">AI个性化训练</h2>
            <p className="text-purple-200 text-center mb-8">
              与你的AI投资顾问对话，训练它了解你的投资偏好和风格
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左侧：基本信息 */}
              <div className="space-y-6">
                <div>
                  <label className="block text-purple-200 mb-2">AI Name</label>
                  <input
                    type="text"
                    value={aiData.name}
                    onChange={(e) => setAiData({...aiData, name: e.target.value})}
                    placeholder="给你的AI起个名字"
                    className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-purple-200 mb-2">Risk Level</label>
                  <select
                    value={aiData.riskLevel}
                    onChange={(e) => setAiData({...aiData, riskLevel: e.target.value})}
                    className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="conservative">保守型 (低风险)</option>
                    <option value="moderate">稳健型 (中等风险)</option>
                    <option value="aggressive">激进型 (高风险)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-purple-200 mb-2">专业领域</label>
                  <input
                    type="text"
                    value={aiData.specialization}
                    onChange={(e) => setAiData({...aiData, specialization: e.target.value})}
                    placeholder="如：DeFi, GameFi, Layer1"
                    className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                {/* 训练状态 */}
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <h4 className="text-white font-medium mb-2">训练状态</h4>
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center gap-2 ${aiData.trainingComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                      {aiData.trainingComplete ? '✅' : '⏳'} 个性化训练
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      ⏳ 头像生成
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      ⏳ NFT铸造
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：训练聊天 */}
              <div className="lg:col-span-2">
                {!showTrainingResult ? (
                  <AITrainingChat
                    personalityType={aiData.personality}
                    riskLevel={aiData.riskLevel}
                    onTrainingComplete={(data) => {
                      setAiData(prev => ({ ...prev, trainingComplete: true }));
                      setTrainingData(data);
                      setShowTrainingResult(true);
                      console.log('训练完成:', data);
                    }}
                  />
                ) : (
                  <div className="text-center space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="text-green-600 text-lg font-semibold mb-2">
                        🎉 AI训练完成！
                      </div>
                      <p className="text-gray-600 mb-4">
                        你的 {aiData.personality} 类型AI顾问 "{aiData.name}" 已经完成训练
                      </p>
                      <div className="text-sm text-gray-500">
                        训练轮次: {trainingData.length}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowTrainingResult(false);
                        setStep(3); // 进入头像生成步骤
                      }}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      继续生成AI形象
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 生成AI形象 */}
        {step === 3 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">生成AI形象</h2>
            <p className="text-purple-200 text-center mb-8">
              AI将自动为你的投资顾问生成独特的专属头像
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左侧：AI信息预览 */}
              <div className="space-y-6">
                <div className="bg-black/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">AI角色信息</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-purple-300">名称：</span>
                      <span className="text-white">{aiData.name || '未命名'}</span>
                    </div>
                    <div>
                      <span className="text-purple-300">类型：</span>
                      <span className="text-white">
                        {personalities.find(p => p.id === aiData.personality)?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-300">风险偏好：</span>
                      <span className="text-white capitalize">{aiData.riskLevel}</span>
                    </div>
                    {aiData.specialization && (
                      <div>
                        <span className="text-purple-300">专业领域：</span>
                        <span className="text-white">{aiData.specialization}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                  <h4 className="text-white font-medium mb-2">✨ 训练状态</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-400">
                      ✅ 个性化训练完成
                    </div>
                    <div className={`flex items-center gap-2 ${aiData.avatarUrl ? 'text-green-400' : 'text-yellow-400'}`}>
                      {aiData.avatarUrl ? '✅' : '⏳'} 头像生成
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      ⏳ NFT铸造
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：头像生成器 */}
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-2">🎨 AI头像生成</h3>
                  <p className="text-purple-200 text-sm mb-4">
                    {!aiData.avatarUrl ? (
                      <span className="text-yellow-400 font-medium">⚠️ 生成专属头像后才能继续</span>
                    ) : (
                      <span className="text-green-400 font-medium">✅ 头像已生成，可以继续</span>
                    )}
                  </p>
                </div>

                <AvatarGenerator
                  personalityType={aiData.personality}
                  onAvatarGenerated={handleAvatarGenerated}
                />

                {/* 显示生成的头像 */}
                {aiData.avatarUrl && (
                  <div className="mt-6 text-center">
                    <div className="inline-block p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl border border-green-500/30">
                      <p className="text-green-400 text-sm mb-3 font-medium">🎉 AI头像生成成功！</p>
                      <img
                        src={aiData.avatarUrl}
                        alt="Generated Avatar"
                        className="w-32 h-32 rounded-xl object-cover mx-auto border-2 border-green-400/50"
                      />
                      <p className="text-green-300 text-xs mt-2">准备铸造NFT！</p>
                    </div>
                  </div>
                )}

                {/* 如果没有头像，显示提示 */}
                {!aiData.avatarUrl && (
                  <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🤖</div>
                      <p className="text-yellow-300 text-sm font-medium">
                        点击上方按钮生成独特的AI头像
                      </p>
                      <p className="text-yellow-400 text-xs mt-1">
                        头像将作为NFT的重要组成部分
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 铸造NFT */}
        {step === 4 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">铸造NFT</h2>
            <p className="text-purple-200 text-center mb-8">
              将你的AI角色铸造成独一无二的NFT
            </p>

            <div className="max-w-2xl mx-auto">
              <div className="bg-black/30 rounded-xl p-6 mb-8">
                <div className="flex items-center space-x-4 mb-6">
                  {aiData.avatarUrl ? (
                    <img
                      src={aiData.avatarUrl}
                      alt="AI Avatar"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-purple-500"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-3xl">
                      {personalities.find(p => p.id === aiData.personality)?.emoji}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-white">{aiData.name || 'Unnamed AI'}</h3>
                    <p className="text-purple-200">
                      {personalities.find(p => p.id === aiData.personality)?.name}
                    </p>
                    <p className="text-green-400 text-sm">✨ 训练完成 • 头像已生成</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-purple-300">风险偏好：</span>
                    <span className="text-white ml-2 capitalize">{aiData.riskLevel}</span>
                  </div>
                  <div>
                    <span className="text-purple-300">专业领域：</span>
                    <span className="text-white ml-2">{aiData.specialization || '通用'}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <h4 className="text-white font-medium mb-2">💎 NFT铸造说明</h4>
                  <ul className="text-purple-200 text-sm space-y-1">
                    <li>• AI角色将成为独一无二的NFT</li>
                    <li>• 你拥有该AI的完全所有权</li>
                    <li>• 可以出租给其他用户使用</li>
                    <li>• 从每次咨询中获得收益</li>
                    <li>• 可在市场上交易或转让</li>
                  </ul>
                </div>

                <div className="text-center mt-8">
                  <button
                    onClick={handleCreateAI}
                    disabled={isCreating || !aiData.name || !aiData.personality || !aiData.avatarUrl || !aiData.trainingComplete}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg disabled:cursor-not-allowed"
                  >
                    {isCreating ? '🔄 正在铸造NFT...' : '💎 铸造AI NFT (0.1 SOL)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: 上架市场 */}
        {step === 5 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">🎉 创建成功！</h2>
            <p className="text-purple-200 text-center mb-8">
              你的AI投资顾问已成功创建并铸造为NFT！现在可以选择上架到市场或保留私用。
            </p>

            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl p-6 mb-8 border border-green-500/30">
                <div className="flex items-center space-x-4 mb-6">
                  <img
                    src={aiData.avatarUrl}
                    alt="AI Avatar"
                    className="w-24 h-24 rounded-xl object-cover border-2 border-green-400"
                  />
                  <div>
                    <h3 className="text-2xl font-bold text-white">{aiData.name}</h3>
                    <p className="text-green-200">
                      {personalities.find(p => p.id === aiData.personality)?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-green-400 text-sm">✅ 训练完成</span>
                      <span className="text-green-400 text-sm">✅ NFT已铸造</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-green-300">风险偏好：</span>
                    <span className="text-white ml-2 capitalize">{aiData.riskLevel}</span>
                  </div>
                  <div>
                    <span className="text-green-300">专业领域：</span>
                    <span className="text-white ml-2">{aiData.specialization || '通用'}</span>
                  </div>
                </div>
              </div>

              {/* 选择操作 */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-500/30">
                  <h4 className="text-xl font-bold text-white mb-4">🏪 上架市场</h4>
                  <p className="text-purple-200 text-sm mb-4">
                    将你的AI放到市场上，让其他用户付费使用，你可以获得持续收益。
                  </p>
                  <ul className="text-purple-300 text-sm space-y-1 mb-6">
                    <li>• 设置使用价格</li>
                    <li>• 获得被动收入</li>
                    <li>• 扩大AI影响力</li>
                    <li>• 随时可以下架</li>
                  </ul>
                  <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-medium transition-all">
                    上架到市场
                  </button>
                </div>

                <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/30">
                  <h4 className="text-xl font-bold text-white mb-4">🔒 私人使用</h4>
                  <p className="text-blue-200 text-sm mb-4">
                    保留AI仅供个人使用，享受专属的投资建议服务。
                  </p>
                  <ul className="text-blue-300 text-sm space-y-1 mb-6">
                    <li>• 专属投资顾问</li>
                    <li>• 隐私保护</li>
                    <li>• 随时可以上架</li>
                    <li>• 持续学习优化</li>
                  </ul>
                  <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 rounded-lg font-medium transition-all">
                    保留私用
                  </button>
                </div>
              </div>

              <div className="text-center mt-8">
                <p className="text-purple-200 text-sm mb-4">
                  恭喜！你已成功创建了专属的AI投资顾问。
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => window.location.href = '/marketplace'}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    浏览市场
                  </button>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
                  >
                    我的AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 导航按钮 */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ← Back
          </button>
          
          {step < 4 ? (
            <div className="flex flex-col items-end">
              {/* 步骤提示 */}
              {step === 1 && (!aiData.name || !aiData.personality) && (
                <p className="text-yellow-400 text-sm mb-2 font-medium">
                  ⚠️ 请输入AI名称并选择性格类型
                </p>
              )}
              {step === 2 && !aiData.trainingComplete && (
                <p className="text-yellow-400 text-sm mb-2 font-medium">
                  ⚠️ 请先完成AI训练
                </p>
              )}
              {step === 3 && !aiData.avatarUrl && (
                <p className="text-yellow-400 text-sm mb-2 font-medium">
                  ⚠️ 请先生成AI头像
                </p>
              )}
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && (!aiData.name || !aiData.personality)) ||
                  (step === 2 && !aiData.trainingComplete) ||
                  (step === 3 && !aiData.avatarUrl)
                }
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  (step === 1 && (!aiData.name || !aiData.personality)) ||
                  (step === 2 && !aiData.trainingComplete) ||
                  (step === 3 && !aiData.avatarUrl)
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                }`}
              >
                Next →
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* NFT铸造成功弹窗 */}
      {showSuccessModal && nftMintResult && (
        <NFTMintSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setStep(5); // 跳转到完成步骤
          }}
          nftData={nftMintResult}
        />
      )}
    </div>
  );
}
