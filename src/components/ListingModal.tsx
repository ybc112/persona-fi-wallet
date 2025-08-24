'use client';

import { useState } from 'react';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';

interface ListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nftDetails: {
    id: number;
    name: string;
    personalityType: string;
    avatarUrl?: string;
  };
}

export default function ListingModal({ isOpen, onClose, onSuccess, nftDetails }: ListingModalProps) {
  const { publicKey } = useSolanaWallet();
  const [listingType, setListingType] = useState<'sale' | 'rental'>('sale');
  const [price, setPrice] = useState('');
  const [rentalPricePerDay, setRentalPricePerDay] = useState('');
  const [minRentalDays, setMinRentalDays] = useState('1');
  const [maxRentalDays, setMaxRentalDays] = useState('30');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    // 验证输入
    if (listingType === 'sale' && (!price || parseFloat(price) <= 0)) {
      setError('Please enter a valid sale price');
      return;
    }

    if (listingType === 'rental') {
      if (!rentalPricePerDay || parseFloat(rentalPricePerDay) <= 0) {
        setError('Please enter a valid daily rental price');
        return;
      }
      
      const minDays = parseInt(minRentalDays);
      const maxDays = parseInt(maxRentalDays);
      
      if (minDays < 1 || maxDays < minDays || maxDays > 365) {
        setError('Please enter valid rental period (1-365 days, min ≤ max)');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // 计算过期时间
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      const requestBody = {
        walletAddress: publicKey,
        personaId: nftDetails.id,
        listingType,
        ...(listingType === 'sale' ? { price: parseFloat(price) } : {}),
        ...(listingType === 'rental' ? {
          rentalPricePerDay: parseFloat(rentalPricePerDay),
          minRentalDays: parseInt(minRentalDays),
          maxRentalDays: parseInt(maxRentalDays)
        } : {}),
        expiresAt: expiresAt.toISOString()
      };

      console.log('📋 提交上架请求:', requestBody);

      const response = await fetch('/api/marketplace/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ 上架成功:', result);
        onSuccess();
        // 重置表单
        setPrice('');
        setRentalPricePerDay('');
        setMinRentalDays('1');
        setMaxRentalDays('30');
        setExpiresInDays('30');
      } else {
        setError(result.error || 'Failed to list NFT');
      }
    } catch (error: any) {
      console.error('❌ 上架失败:', error);
      setError(error.message || 'Failed to list NFT');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">List NFT</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* NFT信息 */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-black/20 rounded-lg border border-purple-500/20">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl overflow-hidden">
            {nftDetails.avatarUrl ? (
              <img src={nftDetails.avatarUrl} alt={nftDetails.name} className="w-full h-full object-cover" />
            ) : (
              '🤖'
            )}
          </div>
          <div>
            <div className="text-white font-bold">{nftDetails.name}</div>
            <div className="text-purple-300 text-sm">{nftDetails.personalityType}</div>
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 上架类型 */}
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-3">
              Listing Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setListingType('sale')}
                className={`p-3 rounded-lg border transition-all ${
                  listingType === 'sale'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-black/20 border-gray-600 text-gray-300 hover:border-purple-500/50'
                }`}
              >
                <div className="font-medium">Sale</div>
                <div className="text-xs opacity-75">Permanent transfer</div>
              </button>
              <button
                type="button"
                onClick={() => setListingType('rental')}
                className={`p-3 rounded-lg border transition-all ${
                  listingType === 'rental'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-black/20 border-gray-600 text-gray-300 hover:border-purple-500/50'
                }`}
              >
                <div className="font-medium">Rental</div>
                <div className="text-xs opacity-75">Temporary access</div>
              </button>
            </div>
          </div>

          {/* 价格设置 */}
          {listingType === 'sale' ? (
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">
                Sale Price (SOL)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price in SOL"
                className="w-full bg-black/20 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors"
                required
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-2">
                  Daily Rental Price (SOL)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={rentalPricePerDay}
                  onChange={(e) => setRentalPricePerDay(e.target.value)}
                  placeholder="Enter daily price in SOL"
                  className="w-full bg-black/20 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Min Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={minRentalDays}
                    onChange={(e) => setMinRentalDays(e.target.value)}
                    className="w-full bg-black/20 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-purple-300 text-sm font-medium mb-2">
                    Max Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={maxRentalDays}
                    onChange={(e) => setMaxRentalDays(e.target.value)}
                    className="w-full bg-black/20 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* 过期时间 */}
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              Listing Expires In (Days)
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="w-full bg-black/20 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          {/* 费用说明 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-blue-300 text-sm font-medium mb-2">Fee Structure</div>
            <div className="text-blue-200 text-xs space-y-1">
              <div>• Platform fee: 2.5% of sale price</div>
              <div>• Creator royalty: 5% of sale price</div>
              <div>• You will receive: ~92.5% of sale price</div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading}
            >
              {loading ? 'Listing...' : `List for ${listingType === 'sale' ? 'Sale' : 'Rental'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
