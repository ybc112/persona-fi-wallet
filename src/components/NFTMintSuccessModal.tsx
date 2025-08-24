import React from 'react';
import { CheckCircle, ExternalLink, Copy, Share2, Sparkles } from 'lucide-react';

interface NFTMintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftData: {
    name: string;
    mintAddress: string;
    transactionSignature: string;
    avatarUrl?: string;
    metadataUri?: string;
  };
}

export default function NFTMintSuccessModal({ 
  isOpen, 
  onClose, 
  nftData 
}: NFTMintSuccessModalProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const shareNFT = async () => {
    const shareData = {
      title: `我刚刚铸造了AI角色NFT: ${nftData.name}`,
      text: `在PersonaFi平台上创建了专属AI投资顾问NFT！`,
      url: `https://explorer.solana.com/address/${nftData.mintAddress}?cluster=devnet`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('分享取消或失败');
      }
    } else {
      // 回退到复制链接
      copyToClipboard(shareData.url, 'share');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-violet-900/95 backdrop-blur-xl rounded-3xl border border-purple-500/30 max-w-md w-full mx-auto shadow-2xl shadow-purple-500/25 animate-in fade-in-0 zoom-in-95 duration-300">
        {/* 头部装饰 */}
        <div className="relative overflow-hidden rounded-t-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl"></div>
          
          <div className="relative p-8 text-center">
            {/* 成功图标 */}
            <div className="relative mx-auto mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/25">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">
              🎉 铸造成功！
            </h2>
            <p className="text-purple-200 text-lg">
              您的AI角色代币已成功创建
            </p>
            <p className="text-purple-300 text-sm mt-2">
              这是一个具有NFT特征的代币 (供应量=1, 小数位=0)
            </p>
          </div>
        </div>

        {/* NFT信息 */}
        <div className="p-6 space-y-6">
          {/* NFT预览 */}
          <div className="bg-black/20 rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center space-x-4">
              {nftData.avatarUrl && (
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500/30">
                  <img 
                    src={nftData.avatarUrl} 
                    alt={nftData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{nftData.name}</h3>
                <p className="text-purple-300 text-sm">AI Investment Advisor Token</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                    PFAI Token
                  </span>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-500/30 ml-2">
                    NFT特征
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            {/* Mint地址 */}
            <div className="bg-black/20 rounded-xl p-3 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-purple-300 text-xs mb-1">代币Mint地址</p>
                  <p className="text-white font-mono text-sm truncate">
                    {nftData.mintAddress}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(nftData.mintAddress, 'mint')}
                  className="ml-2 p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
                >
                  {copied === 'mint' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 交易签名 */}
            <div className="bg-black/20 rounded-xl p-3 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-purple-300 text-xs mb-1">交易签名</p>
                  <p className="text-white font-mono text-sm truncate">
                    {nftData.transactionSignature}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(nftData.transactionSignature, 'tx')}
                  className="ml-2 p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
                >
                  {copied === 'tx' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 外部链接 */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://explorer.solana.com/address/${nftData.mintAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 text-blue-300 hover:text-white px-4 py-3 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">查看详情</span>
            </a>

            <button
              onClick={shareNFT}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 text-green-300 hover:text-white px-4 py-3 rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">分享</span>
            </button>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
          >
            继续探索
          </button>

          {/* 提示信息 */}
          <div className="text-center">
            <p className="text-purple-300 text-xs leading-relaxed">
              🎊 恭喜！您现在拥有了专属的AI投资顾问代币<br/>
              这是一个具有NFT特征的代币，可以代表您的AI角色
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
