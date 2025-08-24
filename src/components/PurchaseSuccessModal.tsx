'use client';

import { useState } from 'react';

interface PurchaseSuccessData {
  nftName: string;
  purchaseType: 'buy' | 'rent';
  price: number;
  transactionSignature: string;
  rentalDays?: number;
  expiryDate?: string;
  avatarUrl?: string;
}

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseData: PurchaseSuccessData;
}

export default function PurchaseSuccessModal({
  isOpen,
  onClose,
  purchaseData
}: PurchaseSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyTransactionId = async () => {
    try {
      await navigator.clipboard.writeText(purchaseData.transactionSignature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const viewOnExplorer = () => {
    window.open(`https://explorer.solana.com/tx/${purchaseData.transactionSignature}?cluster=devnet`, '_blank');
  };

  const startUsingAI = () => {
    // 跳转到AI使用页面或关闭模态框
    onClose();
    // 这里可以添加跳转逻辑
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/20 animate-in fade-in duration-300">
        {/* Success Icon */}
        <div className="text-center pt-8 pb-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {purchaseData.purchaseType === 'buy' ? '购买成功！' : '租赁成功！'}
          </h3>
          <p className="text-purple-300">
            {purchaseData.purchaseType === 'buy' 
              ? '恭喜您成功获得AI所有权' 
              : '您已获得AI的临时使用权限'
            }
          </p>
        </div>

        {/* NFT Info */}
        <div className="px-6 pb-6">
          <div className="bg-black/20 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                {purchaseData.avatarUrl ? (
                  <img 
                    src={purchaseData.avatarUrl} 
                    alt={purchaseData.nftName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🤖</span>
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">{purchaseData.nftName}</h4>
                <p className="text-purple-300 text-sm">
                  {purchaseData.purchaseType === 'buy' ? '完全所有权' : `租赁 ${purchaseData.rentalDays} 天`}
                </p>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">支付金额</span>
                <span className="text-white font-medium">{purchaseData.price.toFixed(4)} SOL</span>
              </div>
              {purchaseData.purchaseType === 'rent' && purchaseData.expiryDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">到期时间</span>
                  <span className="text-white">{new Date(purchaseData.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">交易ID</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-mono text-xs">
                    {purchaseData.transactionSignature.slice(0, 8)}...{purchaseData.transactionSignature.slice(-8)}
                  </span>
                  <button
                    onClick={copyTransactionId}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                    title="复制交易ID"
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
            <h5 className="text-white font-medium mb-2">🎉 接下来您可以：</h5>
            <ul className="space-y-1 text-sm text-purple-200">
              {purchaseData.purchaseType === 'buy' ? (
                <>
                  <li>• 开始使用AI获取投资建议</li>
                  <li>• 查看AI的历史表现数据</li>
                  <li>• 重新定价并出售给其他用户</li>
                  <li>• 从AI产生的收益中获得分成</li>
                </>
              ) : (
                <>
                  <li>• 在租期内使用AI获取投资建议</li>
                  <li>• 查看AI的实时分析和推荐</li>
                  <li>• 跟随AI的投资策略进行交易</li>
                  <li>• 评价AI的表现帮助其他用户</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={startUsingAI}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
            >
              开始使用AI
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={viewOnExplorer}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                查看交易
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                关闭
              </button>
            </div>
          </div>

          {/* Social Share */}
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-xs mb-2">分享您的成功</p>
            <div className="flex justify-center space-x-3">
              <button className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </button>
              <button className="w-8 h-8 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
