"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { TradeResult } from '@/services/tradeExecutionService';

interface TradeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TradeResult | null;
  onRetry?: () => void;
}

export default function TradeStatusModal({
  isOpen,
  onClose,
  result,
  onRetry
}: TradeStatusModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!isOpen || !result) return null;

  const copySignature = async () => {
    if (result.signature) {
      try {
        await navigator.clipboard.writeText(result.signature);
        setCopied(true);
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  const openExplorer = () => {
    if (result.signature) {
      window.open(
        `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
        '_blank'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl border border-purple-500/30 max-w-md w-full">
        {/* 头部 */}
        <div className="p-6 text-center">
          {result.success ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">交易成功！</h3>
                <p className="text-green-300">您的交易已成功执行</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">交易失败</h3>
                <p className="text-red-300">交易执行过程中出现错误</p>
              </div>
            </div>
          )}
        </div>

        {/* 交易详情 */}
        <div className="px-6 pb-6 space-y-4">
          {result.success && (
            <>
              {/* 交易摘要 */}
              <div className="bg-black/20 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">交易摘要</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-300">交换数量</span>
                    <span className="text-white">{result.inputAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300">获得数量</span>
                    <span className="text-white">{result.outputAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300">价格影响</span>
                    <span className="text-white">{result.priceImpact}%</span>
                  </div>
                </div>
              </div>

              {/* 交易哈希 */}
              {result.signature && (
                <div className="bg-black/20 rounded-xl p-4">
                  <h4 className="text-white font-medium mb-3">交易哈希</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/30 rounded-lg p-2">
                      <code className="text-purple-300 text-xs break-all">
                        {result.signature}
                      </code>
                    </div>
                    <button
                      onClick={copySignature}
                      className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors"
                      title="复制交易哈希"
                    >
                      <Copy className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>
                  {copied && (
                    <p className="text-green-400 text-xs mt-2">已复制到剪贴板</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* 错误信息 */}
          {!result.success && result.error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <h4 className="text-red-300 font-medium mb-2">错误详情</h4>
              <p className="text-red-200 text-sm">{result.error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            {result.success ? (
              <>
                {result.signature && (
                  <button
                    onClick={openExplorer}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    查看详情
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-medium transition-all"
                >
                  完成
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-all"
                >
                  关闭
                </button>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-medium transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                )}
              </>
            )}
          </div>

          {/* 成功提示 */}
          {result.success && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-green-300 font-medium mb-1">交易已确认</h5>
                  <p className="text-green-200 text-sm">
                    您的钱包余额将在几秒钟内更新。如果余额未及时更新，请手动刷新钱包。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}