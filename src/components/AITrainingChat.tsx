import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Brain, CheckCircle } from 'lucide-react';
import { useJupiterMarketData } from '../hooks/useJupiterMarketData';
import { MarketDataAggregator } from '../services/marketDataAggregator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITrainingChatProps {
  personalityType: string;
  riskLevel: string;
  onTrainingComplete: (trainingData: Message[]) => void;
  className?: string;
}

export default function AITrainingChat({
  personalityType,
  riskLevel,
  onTrainingComplete,
  className = ''
}: AITrainingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 集成Jupiter市场数据
  const { marketData, isLoading: marketLoading } = useJupiterMarketData();

  // 简化的训练阶段
  const [trainingPhase, setTrainingPhase] = useState<'description' | 'analysis' | 'completed'>('description');
  const [userDescription, setUserDescription] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);

  useEffect(() => {
    // 初始化欢迎消息
    const welcomeMessage: Message = {
      id: '1',
      role: 'assistant',
      content: `你好！我是你的${personalityType}类型AI投资顾问。

为了更好地为你服务，请用你自己的话描述一下：
• 你的投资经验和背景
• 你的投资目标和偏好
• 你的风险承受能力
• 你关注的投资领域
• 你的投资决策习惯

不用回答具体问题，就像和朋友聊天一样，告诉我你的投资情况就行。我会分析理解你的投资风格，然后确认是否准确。`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [personalityType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 简化的进度计算
    let progress = 0;
    if (trainingPhase === 'description') progress = 0;
    else if (trainingPhase === 'analysis') progress = 60;
    else if (trainingPhase === 'completed') progress = 100;

    setTrainingProgress(progress);

    // 检查是否完成训练
    if (trainingPhase === 'completed') {
      setTimeout(() => {
        onTrainingComplete(messages);
      }, 1000);
    }
  }, [trainingPhase, messages, onTrainingComplete]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const confirmAnalysis = () => {
    setShowConfirmButtons(false);
    setTrainingPhase('completed');

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `🎉 **个性化训练完成！**

我已经充分了解了你的投资风格和偏好。现在我可以为你提供真正个性化的投资建议了！

你的专属AI投资顾问已经准备就绪，让我们开始你的投资之旅吧！`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      if (trainingPhase === 'description') {
        // 用户描述阶段 - 保存描述并进入分析阶段
        setUserDescription(currentInput);
        setTrainingPhase('analysis');

        // 调用AI分析API，包含Jupiter市场数据
        const analysisPayload = {
          personalityType,
          riskLevel,
          userDescription: currentInput,
          marketData: marketData ? {
            prices: marketData.prices,
            marketSentiment: marketData.marketSentiment,
            trending: marketData.trending?.slice(0, 10),
            timestamp: marketData.timestamp
          } : null
        };

        const response = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analysisPayload),
        });

        const data = await response.json();

        if (data.success) {
          setAiAnalysis(data.analysis);
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `感谢你的描述！基于你的投资情况，我分析出以下特征：

${data.analysis}

请查看这个分析是否准确。你可以：
• 如果分析准确，点击下方的"确认分析"按钮
• 如果需要调整，继续发消息告诉我哪里需要修改`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setShowConfirmButtons(true);
        } else {
          throw new Error(data.error || 'AI分析失败');
        }

      } else if (trainingPhase === 'analysis') {
        // 用户要求调整分析
        console.log('🔧 调整分析参数:', {
          originalAnalysis: aiAnalysis,
          userFeedback: currentInput,
          personalityType,
          riskLevel
        });

        if (!aiAnalysis) {
          throw new Error('没有原始分析数据，请重新开始训练');
        }

        const adjustPayload = {
          originalAnalysis: aiAnalysis,
          userFeedback: currentInput,
          personalityType,
          riskLevel,
          marketData: marketData ? {
            prices: marketData.prices,
            marketSentiment: marketData.marketSentiment,
            trending: marketData.trending?.slice(0, 10),
            timestamp: marketData.timestamp
          } : null
        };

        const response = await fetch('/api/ai/adjust-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(adjustPayload),
        });

        const data = await response.json();

        if (data.success) {
          setAiAnalysis(data.adjustedAnalysis);
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `我已经根据你的反馈调整了分析：

${data.adjustedAnalysis}

请查看调整后的分析是否更准确。你可以继续提出修改意见，或点击"确认分析"按钮完成训练。`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error(data.error || 'AI调整失败');
        }
      }

    } catch (error) {
      console.error('训练错误:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，训练过程中出现了错误，请重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI个性化训练</h3>
            <p className="text-purple-200 text-sm">与AI对话，训练你的专属投资偏好</p>
          </div>
        </div>

        {/* 训练进度 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-purple-200">个性化训练进度</span>
            <span className="text-sm text-purple-200">
              {trainingPhase === 'description' && '描述阶段'}
              {trainingPhase === 'analysis' && '分析确认阶段'}
              {trainingPhase === 'completed' && '完成'}
            </span>
          </div>

          {/* 总体进度条 */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${trainingProgress}%` }}
            />
          </div>

          {trainingProgress >= 100 ? (
            <div className="flex items-center gap-2 mt-3 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">🎉 个性化训练完成！AI已掌握你的投资风格</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-3 text-yellow-400">
              <Brain className="w-4 h-4" />
              <span className="text-sm">正在深度学习你的投资策略...</span>
            </div>
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-black/30 text-purple-100 border border-purple-500/30'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-black/30 border border-purple-500/30 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 确认按钮区域 */}
      {showConfirmButtons && trainingPhase === 'analysis' && (
        <div className="p-4 border-t border-purple-500/30 bg-purple-900/20">
          <div className="flex justify-center">
            <button
              onClick={confirmAnalysis}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all flex items-center gap-2 font-semibold"
            >
              ✅ 确认分析，完成训练
            </button>
          </div>
          <p className="text-center text-purple-200 text-sm mt-2">
            如果分析不准确，可以继续发消息提出修改意见
          </p>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-6 border-t border-purple-500/30">
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的投资问题或偏好..."
            className="flex-1 bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
