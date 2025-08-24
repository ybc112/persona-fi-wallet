"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Brain, Sparkles, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasMarketData?: boolean;
}

interface AIPersonaChatInterfaceProps {
  personaId: number;
  personaName: string;
  personalityType: string;
  avatarUrl?: string;
  marketData?: any;
  className?: string;
}

export default function AIPersonaChatInterface({ 
  personaId,
  personaName,
  personalityType,
  avatarUrl,
  marketData,
  className = '' 
}: AIPersonaChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从数据库加载聊天历史记录
  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      console.log('📚 加载聊天历史记录 - Persona ID:', personaId);

      const response = await fetch(`/api/ai/chat-history?personaId=${personaId}`);
      const data = await response.json();

      if (data.success && data.messages.length > 0) {
        console.log('✅ 加载到', data.messages.length, '条历史消息');
        // 转换时间戳格式
        const formattedMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        setShowQuickActions(false); // 如果有历史消息，隐藏快捷操作
      } else {
        // 如果没有历史消息，显示欢迎消息
        const welcomeMessage: Message = {
          id: 'welcome-1',
          role: 'assistant',
          content: `你好！我是${personaName}，你的专属${personalityType}AI投资顾问。

我已经接入了实时的Jupiter聚合器市场数据，可以为你提供最新的Solana生态投资分析和建议。

${marketData ? `📊 当前市场状态：
• SOL价格：$${marketData.prices?.[Object.keys(marketData.prices)[0]]?.price?.toFixed(2) || 'N/A'}
• 市场情绪：${marketData.marketSentiment || 'Neutral'}
• 数据更新时间：${new Date(marketData.timestamp).toLocaleTimeString()}` : ''}

我可以帮你：
🔍 分析市场趋势和机会
💡 提供个性化投资建议
⚠️ 评估风险和制定策略
📈 推荐Jupiter交换机会

请告诉我你想了解什么，或者使用下方的快捷操作！`,
          timestamp: new Date(),
          hasMarketData: !!marketData
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('❌ 加载聊天历史失败:', error);
      // 出错时显示欢迎消息
      const welcomeMessage: Message = {
        id: 'welcome-1',
        role: 'assistant', 
        content: `你好！我是${personaName}，你的专属${personalityType}AI投资顾问。

我可以帮你分析市场和制定投资策略。请告诉我你想了解什么！`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    // 加载聊天历史记录
    loadChatHistory();
  }, [personaId, personaName, personalityType, marketData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    // 立即显示用户消息
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      console.log('🤖 发送AI咨询请求:', { personaId, userMessage: currentMessage });
      
      // 调用增强的AI咨询API，包含市场数据
      const response = await fetch('/api/ai/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personaId,
          userMessage: currentMessage,
          marketData: marketData ? {
            prices: marketData.prices,
            marketSentiment: marketData.marketSentiment,
            trending: marketData.topTraded?.slice(0, 5),
            timestamp: marketData.timestamp
          } : null
        }),
      });

      const data = await response.json();
      console.log('💬 API响应:', data);

      if (data.success) {
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          hasMarketData: !!marketData
        };
        
        // 显示AI回复消息
        setMessages(prev => [...prev, aiMessage]);
        console.log('✅ 消息已成功保存到数据库并显示');
      } else {
        throw new Error(data.error || 'AI咨询失败');
      }
    } catch (error) {
      console.error('❌ 咨询错误:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，咨询过程中出现了错误，请重试。如果问题持续，请检查网络连接。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    const quickMessages = {
      'market-analysis': '请分析当前Solana生态的市场情况，包括主要代币的表现和投资机会',
      'portfolio-review': '请帮我分析我的投资组合，给出优化建议',
      'risk-assessment': '请评估当前市场的风险状况，并给出相应的投资策略',
      'jupiter-opportunities': '请分析Jupiter聚合器上的交换机会和套利空间'
    };

    const message = quickMessages[action as keyof typeof quickMessages];
    if (message) {
      setInputMessage(message);
      // 自动发送消息
      setTimeout(() => {
        sendMessage();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl border border-purple-500/30 flex flex-col ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-purple-500/30 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={personaName}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
              />
            ) : (
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {personaName}
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </h3>
            <p className="text-purple-200 text-sm">
              专属{personalityType}AI投资顾问 • 
              {marketData ? (
                <span className="text-green-400 ml-1">实时市场数据已连接</span>
              ) : (
                <span className="text-yellow-400 ml-1">基础模式</span>
              )}
            </p>
          </div>
          
          {marketData && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Live Market Data</span>
              </div>
              <div className="text-purple-300 text-xs">
                {Object.keys(marketData.prices || {}).length} tokens tracked
              </div>
            </div>
          )}
        </div>

        {marketData && (
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-3 border border-green-500/30">
            <p className="text-green-300 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              基于Jupiter实时数据，提供最新的Solana生态投资分析
            </p>
          </div>
        )}
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-container">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-purple-300">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">📚 正在加载聊天历史...</span>
              </div>
            </div>
          ) : (
            <div className="chat-messages space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 chat-message ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={personaName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 message-bubble ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white ml-auto'
                        : 'bg-black/40 backdrop-blur-sm border border-purple-500/30 text-purple-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`text-xs ${message.role === 'user' ? 'text-purple-200' : 'text-purple-400'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                      {message.hasMarketData && message.role === 'assistant' && (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <TrendingUp className="w-3 h-3" />
                          <span>Live Data</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={personaName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI正在分析市场数据...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 快捷操作按钮 */}
      {showQuickActions && messages.length <= 1 && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickAction('market-analysis')}
              className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 text-blue-200 hover:text-blue-100 py-2 px-3 rounded-lg text-sm transition-all"
            >
              📊 市场分析
            </button>
            <button
              onClick={() => handleQuickAction('portfolio-review')}
              className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 hover:border-green-400/50 text-green-200 hover:text-green-100 py-2 px-3 rounded-lg text-sm transition-all"
            >
              💼 组合评估
            </button>
            <button
              onClick={() => handleQuickAction('risk-assessment')}
              className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 hover:border-yellow-400/50 text-yellow-200 hover:text-yellow-100 py-2 px-3 rounded-lg text-sm transition-all"
            >
              ⚠️ 风险评估
            </button>
            <button
              onClick={() => handleQuickAction('jupiter-opportunities')}
              className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-purple-100 py-2 px-3 rounded-lg text-sm transition-all"
            >
              🔄 交换机会
            </button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-6 border-t border-purple-500/30 flex-shrink-0">
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="询问你的专属AI投资顾问..."
            className="flex-1 bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all transform hover:scale-105 disabled:transform-none shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {marketData && (
          <div className="mt-3 text-xs text-purple-400 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            <span>AI建议仅供参考，投资有风险，请谨慎决策</span>
          </div>
        )}
      </div>
    </div>
  );
}
