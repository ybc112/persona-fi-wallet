"use client";

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, AlertTriangle, Clock, Info } from 'lucide-react';
import { TradeConfirmationData } from '@/services/tradeExecutionService';

interface Recommendation {
  type: string;
  token: string;
  confidence: number;
  reasoning: string;
  riskLevel: string;
}

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmationData: TradeConfirmationData | null;
  isExecuting: boolean;
  recommendation: Recommendation | null;
}

export default function TradeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  confirmationData,
  isExecuting,
  recommendation
}: TradeConfirmationModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // 倒计时逻辑
  useEffect(() => {
    if (!isOpen || !confirmationData) return;

    const expiresAt = confirmationData.expiresAt;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, confirmationData, onClose]);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      setTimeLeft(30);
    }
  }, [isOpen]);

  if (!isOpen || !confirmationData) return null;

  const handleConfirm = () => {
    if (isConfirmed && !isExecuting) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl border border-purple-500/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">确认交易</h2>
              <p className="text-gray-400 text-sm">请仔细检查交易详情</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 倒计时 */}
        <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              报价将在 <span className="font-bold">{timeLeft}</span> 秒后过期
            </span>
          </div>
        </div>

        {/* 交易概览 */}
        <div className="p-6 space-y-6">
          {/* 代币交换 */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-white">
                  {confirmationData.inputToken.amount}
                </div>
                <div className="text-gray-400">{confirmationData.inputToken.symbol}</div>
              </div>
              
              <div className="mx-4">
                <ArrowRight className="w-6 h-6 text-purple-400" />
              </div>
              
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-green-400">
                  {confirmationData.outputToken.estimatedAmount}
                </div>
                <div className="text-gray-400">{confirmationData.outputToken.symbol}</div>
              </div>
            </div>
          </div>

          {/* AI推荐信息 */}
          {recommendation && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium">AI推荐</span>
              </div>
              <p className="text-gray-300 text-sm">{recommendation.reasoning}</p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-green-400">置信度: {recommendation.confidence}%</span>
                <span className="text-yellow-400">风险: {recommendation.riskLevel}</span>
              </div>
            </div>
          )}

          {/* 交易详情 */}
          <div className="space-y-3">
            <h3 className="text-white font-medium">交易详情</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">价格影响</span>
                <span className={`${parseFloat(confirmationData.priceImpact) > 1 ? 'text-red-400' : 'text-green-400'}`}>
                  {confirmationData.priceImpact}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">最小接收</span>
                <span className="text-white">
                  {confirmationData.minimumReceived} {confirmationData.outputToken.symbol}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">网络费用</span>
                <span className="text-white">{confirmationData.networkFee} SOL</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">平台费用</span>
                <span className="text-white">{confirmationData.platformFee} SOL</span>
              </div>
            </div>
          </div>

          {/* 风险提示 */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-medium">风险提示</span>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• 加密货币交易存在价格波动风险</li>
              <li>• 交易一旦确认无法撤销</li>
              <li>• 请确保您了解相关风险</li>
              {parseFloat(confirmationData.priceImpact) > 1 && (
                <li className="text-red-400">• 价格影响较大，请谨慎操作</li>
              )}
            </ul>
          </div>

          {/* 演示模式提示 */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium">演示模式说明</span>
            </div>
            <div className="text-gray-300 text-sm space-y-1">
              <p>🎭 <strong>当前为演示模式</strong>：由于Web3Auth对Jupiter VersionedTransaction的兼容性限制，交易将在模拟环境中执行。</p>
              <p>💡 <strong>功能展示</strong>：所有UI流程、AI分析和交易逻辑均为真实实现，仅交易执行为模拟。</p>
              <p>🚀 <strong>生产部署</strong>：在实际应用中可升级至支持VersionedTransaction的钱包SDK。</p>
            </div>
          </div>

          {/* 确认复选框 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="confirm-checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              disabled={isExecuting}
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="confirm-checkbox" className="text-gray-300 text-sm">
              我已阅读并理解上述风险，确认执行此交易
            </label>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || isExecuting || timeLeft === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                执行中...
              </div>
            ) : (
              '确认交易'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}