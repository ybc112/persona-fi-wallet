'use client';

import { useState } from 'react';

interface NFTDetails {
  id: number;
  name: string;
  personalityType: string;
  riskLevel: string;
  specialization?: string;
  description?: string;
  avatarUrl?: string;
  nftMintAddress?: string;
  price?: number;
  creatorWallet: string;
}

interface ListingDetails {
  id: number;
  listingType: 'sale' | 'rental';
  price?: number;
  rentalPricePerDay?: number;
  minRentalDays?: number;
  maxRentalDays?: number;
  status: string;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchaseData: any) => void;
  nftDetails: NFTDetails;
  listing: ListingDetails;
  userWallet?: string;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  nftDetails,
  listing,
  userWallet
}: PurchaseModalProps) {
  const [purchaseType, setPurchaseType] = useState<'buy' | 'rent'>('buy');
  const [rentalDays, setRentalDays] = useState(listing.minRentalDays || 1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateTotalPrice = () => {
    if (purchaseType === 'buy') {
      return Number(listing.price) || 0;
    } else {
      return (Number(listing.rentalPricePerDay) || 0) * rentalDays;
    }
  };

  const calculateFees = () => {
    const totalPrice = calculateTotalPrice();
    const platformFee = totalPrice * 0.025; // 2.5% platform fee
    const creatorRoyalty = totalPrice * 0.05; // 5% creator royalty
    const netPrice = totalPrice - platformFee - creatorRoyalty;

    return {
      totalPrice: Number(totalPrice),
      platformFee: Number(platformFee),
      creatorRoyalty: Number(creatorRoyalty),
      netPrice: Number(netPrice),
      estimatedGas: 0.001 // Estimated SOL for gas
    };
  };

  const fees = calculateFees();

  const handlePurchase = async () => {
    if (!userWallet) {
      setError('请先连接钱包');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/nft/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nftId: nftDetails.id,
          listingId: listing.id,
          purchaseType,
          rentalDays: purchaseType === 'rent' ? rentalDays : undefined,
          buyerWallet: userWallet,
          totalPrice: fees.totalPrice
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.purchase);
      } else {
        setError(result.error || '购买失败');
      }
    } catch (error: any) {
      console.error('购买失败:', error);
      setError(error.message || '购买失败');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/20">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">确认购买</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* NFT Info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {nftDetails.avatarUrl ? (
                <img 
                  src={nftDetails.avatarUrl} 
                  alt={nftDetails.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">🤖</span>
              )}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white">{nftDetails.name}</h4>
              <p className="text-purple-300 text-sm">{nftDetails.personalityType}</p>
              <p className="text-gray-400 text-xs">{nftDetails.specialization}</p>
            </div>
          </div>

          {/* Purchase Type Selection */}
          {listing.listingType === 'sale' && listing.rentalPricePerDay && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-purple-300">购买方式</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPurchaseType('buy')}
                  className={`p-3 rounded-lg border transition-all ${
                    purchaseType === 'buy'
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-purple-500/50'
                  }`}
                >
                  <div className="text-sm font-medium">直接购买</div>
                  <div className="text-xs opacity-75">获得完整所有权</div>
                </button>
                <button
                  onClick={() => setPurchaseType('rent')}
                  className={`p-3 rounded-lg border transition-all ${
                    purchaseType === 'rent'
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-purple-500/50'
                  }`}
                >
                  <div className="text-sm font-medium">租赁使用</div>
                  <div className="text-xs opacity-75">临时使用权限</div>
                </button>
              </div>
            </div>
          )}

          {/* Rental Days Selection */}
          {purchaseType === 'rent' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-purple-300">租赁天数</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setRentalDays(Math.max(listing.minRentalDays || 1, rentalDays - 1))}
                  className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
                >
                  -
                </button>
                <span className="text-white font-medium min-w-[3rem] text-center">{rentalDays} 天</span>
                <button
                  onClick={() => setRentalDays(Math.min(listing.maxRentalDays || 30, rentalDays + 1))}
                  className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-400">
                最少 {listing.minRentalDays} 天，最多 {listing.maxRentalDays} 天
              </p>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="space-y-3 bg-black/20 rounded-lg p-4">
            <h5 className="text-sm font-medium text-purple-300">价格明细</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>
                  {purchaseType === 'buy' ? '购买价格' : `租赁费用 (${rentalDays}天)`}
                </span>
                <span>{fees.totalPrice.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>平台手续费 (2.5%)</span>
                <span>{fees.platformFee.toFixed(4)} SOL</span>
              </div>
              {purchaseType === 'buy' && (
                <div className="flex justify-between text-gray-400">
                  <span>创作者版税 (5%)</span>
                  <span>{fees.creatorRoyalty.toFixed(4)} SOL</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>预估Gas费</span>
                <span>{fees.estimatedGas.toFixed(4)} SOL</span>
              </div>
              <div className="border-t border-gray-600 pt-2 flex justify-between text-white font-medium">
                <span>总计</span>
                <span>{(fees.totalPrice + fees.estimatedGas).toFixed(4)} SOL</span>
              </div>
            </div>
          </div>

          {/* Risk Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-300 text-xs font-medium">投资风险提示</p>
                <p className="text-yellow-200 text-xs mt-1">
                  AI投资建议不保证盈利，请谨慎投资，理性决策。
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-500/20 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handlePurchase}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {processing ? '处理中...' : `确认${purchaseType === 'buy' ? '购买' : '租赁'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
