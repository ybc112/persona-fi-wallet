"use client";

import React, { useState, useEffect } from 'react';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import { Navbar } from '@/components/Navbar';
import PurchaseModal from '@/components/PurchaseModal';
import PurchaseSuccessModal from '@/components/PurchaseSuccessModal';
import Link from 'next/link';

interface MarketplaceListing {
  id: number;
  personaId: number;
  personaName: string;
  personalityType: string;
  riskLevel: string;
  avatarUrl?: string;
  description?: string;
  listingType: 'sale' | 'rental';
  price?: number;
  rentalPricePerDay?: number;
  minRentalDays?: number;
  maxRentalDays?: number;
  nftMintAddress: string;
  sellerWallet: string;
  status: string;
  createdAt: string;
}

export default function MarketplacePage() {
  const { publicKey } = useSolanaWallet();
  const { stats, loading: statsLoading } = useMarketplaceStats();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPurchaseSuccessModal, setShowPurchaseSuccessModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<{
    nftName: string;
    purchaseType: 'buy' | 'rent';
    price: number;
    transactionSignature: string;
    rentalDays?: number;
    expiryDate?: string;
    avatarUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetchMarketplaceListings();
  }, [filter, sortBy]);

  const fetchMarketplaceListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: 'active',
        sortBy: sortBy,
        sortOrder: 'DESC',
        limit: '20',
        offset: '0'
      });

      if (filter !== 'all') {
        params.append('personalityType', filter);
      }

      const response = await fetch(`/api/marketplace/browse?${params}`);
      const result = await response.json();

      if (result.success) {
        setListings(result.listings || []);
      } else {
        setError(result.error || 'Failed to load marketplace listings');
      }
    } catch (error) {
      console.error('获取市场列表失败:', error);
      setError('Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async (listing: MarketplaceListing) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setSelectedListing(listing);
    setShowPurchaseModal(true);
  };

  const handlePurchaseComplete = (purchaseData: any) => {
    setPurchaseSuccessData({
      nftName: purchaseData.nftName,
      purchaseType: purchaseData.purchaseType,
      price: purchaseData.totalPrice,
      transactionSignature: purchaseData.transactionSignature,
      rentalDays: purchaseData.rentalDays,
      expiryDate: purchaseData.expiryDate,
      avatarUrl: purchaseData.avatarUrl
    });
    setShowPurchaseSuccessModal(true);
    setShowPurchaseModal(false);
    // 刷新市场列表
    fetchMarketplaceListings();
  };

  const filterOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'DeFi Expert', label: 'DeFi Expert' },
    { value: 'Meme Hunter', label: 'Meme Hunter' },
    { value: 'Conservative', label: 'Conservative' },
    { value: 'GameFi Pro', label: 'GameFi Pro' },
    { value: 'NFT Specialist', label: 'NFT Specialist' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Newest First' },
    { value: 'price', label: 'Price: Low to High' },
    { value: 'persona_name', label: 'Name A-Z' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">AI Marketplace</h1>
          <p className="text-xl text-purple-200">
            Discover and trade the best AI investment personalities
          </p>
        </div>

        {/* 筛选和排序 */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === option.value
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-black/20 text-purple-200 hover:bg-black/30 border border-purple-500/30'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-black/20 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:border-purple-400 focus:outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-purple-200 mt-4">Loading marketplace...</p>
          </div>
        )}

        {/* 空状态 */}
        {!loading && listings.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-2xl font-bold text-white mb-4">No Listings Found</h3>
            <p className="text-purple-200 mb-8">
              No AI personalities are currently listed for sale. Check back later!
            </p>
            <Link
              href="/create"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Create AI Persona
            </Link>
          </div>
        )}

        {/* AI角色网格 */}
        {!loading && listings.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all group"
              >
                {/* 头部信息 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                      {listing.avatarUrl ? (
                        <img src={listing.avatarUrl} alt={listing.personaName} className="w-full h-full object-cover" />
                      ) : (
                        '🤖'
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{listing.personaName}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-300 text-sm">{listing.personalityType}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          listing.listingType === 'sale'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {listing.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {listing.listingType === 'sale' && listing.price && (
                      <div className="text-2xl font-bold text-white">{listing.price} SOL</div>
                    )}
                    {listing.listingType === 'rental' && listing.rentalPricePerDay && (
                      <div>
                        <div className="text-2xl font-bold text-white">{listing.rentalPricePerDay} SOL</div>
                        <div className="text-purple-300 text-xs">per day</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-purple-300 text-xs">Risk Level</div>
                    <div className="text-white text-sm font-medium">{listing.riskLevel}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs">Listed</div>
                    <div className="text-white text-sm">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* 租赁信息 */}
                {listing.listingType === 'rental' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <div className="text-blue-300 text-xs font-medium mb-1">Rental Terms</div>
                    <div className="text-blue-200 text-xs">
                      {listing.minRentalDays}-{listing.maxRentalDays} days
                    </div>
                  </div>
                )}

                {/* 描述 */}
                {listing.description && (
                  <p className="text-purple-200 text-sm mb-4 line-clamp-2">
                    {listing.description}
                  </p>
                )}

                {/* 创建者 */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-purple-300 text-xs">Seller</span>
                    <div className="text-white text-sm font-mono">
                      {listing.sellerWallet.slice(0, 8)}...{listing.sellerWallet.slice(-4)}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBuyNow(listing)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 rounded-lg font-medium transition-all transform group-hover:scale-105"
                  >
                    {listing.listingType === 'sale' ? 'Buy Now' : 'Rent Now'}
                  </button>
                  <Link
                    href={`/nft/${listing.personaId}`}
                    className="flex-1 bg-black/30 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white py-2 rounded-lg font-medium transition-all text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 统计信息 */}
        <div className="mt-16 bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Marketplace Stats</h2>
          {statsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <p className="text-purple-200 mt-2">Loading stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {stats?.totalPersonas?.toLocaleString() || '0'}
                </div>
                <div className="text-purple-300">Total AI Personas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {stats?.activeTraders?.toLocaleString() || '0'}
                </div>
                <div className="text-purple-300">Active Traders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {stats?.volume24h ? `${stats.volume24h.toFixed(1)} SOL` : '0 SOL'}
                </div>
                <div className="text-purple-300">24h Volume</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {stats?.avgPrice ? `${stats.avgPrice.toFixed(1)} SOL` : '0 SOL'}
                </div>
                <div className="text-purple-300">Avg. Price</div>
              </div>
            </div>
          )}
        </div>

        {/* CTA区域 */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Your Own AI?</h2>
            <p className="text-purple-200 mb-6">
              Join thousands of creators earning from their AI personalities
            </p>
            <a href="/create" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 shadow-lg">
              Create AI Persona
            </a>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedListing && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseComplete}
          nftDetails={{
            id: selectedListing.personaId,
            name: selectedListing.personaName,
            personalityType: selectedListing.personalityType,
            riskLevel: selectedListing.riskLevel,
            specialization: selectedListing.personalityType,
            description: selectedListing.description,
            avatarUrl: selectedListing.avatarUrl,
            nftMintAddress: selectedListing.nftMintAddress,
            price: selectedListing.price,
            creatorWallet: selectedListing.sellerWallet
          }}
          listing={{
            id: selectedListing.id,
            listingType: selectedListing.listingType,
            price: selectedListing.price,
            rentalPricePerDay: selectedListing.rentalPricePerDay,
            minRentalDays: selectedListing.minRentalDays,
            maxRentalDays: selectedListing.maxRentalDays,
            status: selectedListing.status
          }}
          userWallet={publicKey || undefined}
        />
      )}

      {/* Purchase Success Modal */}
      {showPurchaseSuccessModal && purchaseSuccessData && (
        <PurchaseSuccessModal
          isOpen={showPurchaseSuccessModal}
          onClose={() => setShowPurchaseSuccessModal(false)}
          purchaseData={purchaseSuccessData}
        />
      )}
    </div>
  );
}