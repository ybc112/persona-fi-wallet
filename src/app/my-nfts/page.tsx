'use client';

import { useState, useEffect } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';

interface NFTItem {
  id: number;
  name: string;
  personalityType: string;
  riskLevel: string;
  avatarUrl?: string;
  description?: string;
  nftMintAddress?: string;
  isMinted: boolean;
  isListed: boolean;
  price?: number;
  createdAt: string;
  // 上架信息
  listing?: {
    id: number;
    listingType: 'sale' | 'rental';
    price?: number;
    rentalPricePerDay?: number;
    status: string;
  };
}

export default function MyNFTsPage() {
  const { isConnected, login } = useWeb3Auth();
  const { publicKey } = useSolanaWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintingNFTs, setMintingNFTs] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isConnected && publicKey) {
      fetchUserNFTs();
      fetchUserListings();
    }
  }, [isConnected, publicKey]);

  const fetchUserNFTs = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/personas?walletAddress=${publicKey}`);
      const result = await response.json();

      if (result.success) {
        setNfts(result.personas || []);
      } else {
        setError(result.error || 'Failed to load NFTs');
      }
    } catch (error) {
      console.error('获取NFT列表失败:', error);
      setError('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserListings = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/marketplace/list?walletAddress=${publicKey}`);
      const result = await response.json();

      if (result.success) {
        setListings(result.listings || []);
      }
    } catch (error) {
      console.error('获取上架列表失败:', error);
    }
  };

  const getListingForNFT = (personaId: number) => {
    return listings.find(listing => 
      listing.persona_id === personaId && listing.status === 'active'
    );
  };

  const handleCancelListing = async (listingId: number) => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `/api/marketplace/list?listingId=${listingId}&walletAddress=${publicKey}`,
        { method: 'DELETE' }
      );
      
      const result = await response.json();
      
      if (result.success) {
        // 刷新列表
        fetchUserListings();
        alert('上架已取消');
      } else {
        alert(result.error || '取消上架失败');
      }
    } catch (error) {
      console.error('取消上架失败:', error);
      alert('取消上架失败');
    }
  };

  const handleMintNFT = async (nftId: number) => {
    if (!publicKey) return;

    try {
      setMintingNFTs(prev => new Set(prev).add(nftId));

      console.log('🎨 开始铸造NFT:', { personaId: nftId });

      const response = await fetch('/api/nft/mint-umi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          personaId: nftId
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ NFT铸造成功:', result);
        alert(`NFT铸造成功！\nMint地址: ${result.mintAddress}`);
        // 刷新NFT列表
        fetchUserNFTs();
      } else {
        alert(result.error || 'NFT铸造失败');
      }
    } catch (error: any) {
      console.error('❌ NFT铸造失败:', error);
      alert(error.message || 'NFT铸造失败');
    } finally {
      setMintingNFTs(prev => {
        const newSet = new Set(prev);
        newSet.delete(nftId);
        return newSet;
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-8">My NFTs</h1>
            <p className="text-purple-200 mb-8">Connect your wallet to view your NFT collection</p>
            <button
              onClick={login}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">My NFT Collection</h1>
          <p className="text-xl text-purple-200">
            Manage your AI personality NFTs and marketplace listings
          </p>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="text-3xl font-bold text-white mb-2">{nfts.length}</div>
            <div className="text-purple-300">Total NFTs</div>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="text-3xl font-bold text-white mb-2">
              {nfts.filter(nft => nft.isMinted).length}
            </div>
            <div className="text-purple-300">Minted</div>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="text-3xl font-bold text-white mb-2">
              {listings.filter(listing => listing.status === 'active').length}
            </div>
            <div className="text-purple-300">Listed</div>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="text-3xl font-bold text-white mb-2">
              {listings.filter(listing => listing.status === 'sold').length}
            </div>
            <div className="text-purple-300">Sold</div>
          </div>
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
            <p className="text-purple-200 mt-4">Loading your NFTs...</p>
          </div>
        )}

        {/* NFT网格 */}
        {!loading && nfts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-white mb-4">No NFTs Found</h3>
            <p className="text-purple-200 mb-8">
              You haven't created any AI personalities yet. Start building your collection!
            </p>
            <Link 
              href="/create"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Create AI Persona
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {nfts.map((nft) => {
              const listing = getListingForNFT(nft.id);
              
              return (
                <div
                  key={nft.id}
                  className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all group"
                >
                  {/* NFT头部 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                        {nft.avatarUrl ? (
                          <img src={nft.avatarUrl} alt={nft.name} className="w-full h-full object-cover" />
                        ) : (
                          '🤖'
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{nft.name}</h3>
                        <div className="text-purple-300 text-sm">{nft.personalityType}</div>
                      </div>
                    </div>
                    
                    {/* 状态标签 */}
                    <div className="flex flex-col items-end space-y-1">
                      {nft.isMinted ? (
                        <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                          Minted
                        </span>
                      ) : (
                        <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs">
                          Not Minted
                        </span>
                      )}
                      
                      {listing && (
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                          Listed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* NFT信息 */}
                  <div className="mb-4">
                    <div className="text-purple-300 text-sm mb-2">Risk Level: {nft.riskLevel}</div>
                    {nft.description && (
                      <p className="text-gray-300 text-sm line-clamp-2">{nft.description}</p>
                    )}
                  </div>

                  {/* 上架信息 */}
                  {listing && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <div className="text-blue-300 text-sm font-medium mb-1">
                        Listed for {listing.listing_type === 'sale' ? 'Sale' : 'Rental'}
                      </div>
                      {listing.price && (
                        <div className="text-white font-bold">{listing.price} SOL</div>
                      )}
                      {listing.rental_price_per_day && (
                        <div className="text-white font-bold">{listing.rental_price_per_day} SOL/day</div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="space-y-2">
                    {/* 主要操作按钮 */}
                    <div className="flex space-x-2">
                      <Link
                        href={`/chat/${nft.id}`}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-lg font-medium transition-all transform group-hover:scale-105 text-center text-sm"
                      >
                        💬 Use AI Persona
                      </Link>
                      <Link
                        href={`/nft/${nft.id}`}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 rounded-lg font-medium transition-all transform group-hover:scale-105 text-center text-sm"
                      >
                        View Details
                      </Link>
                    </div>

                    {/* 次要操作按钮 */}
                    <div className="flex space-x-2">
                      {listing ? (
                        <button
                          onClick={() => handleCancelListing(listing.id)}
                          className="flex-1 bg-red-500/20 border border-red-500/30 hover:border-red-400/50 text-red-300 hover:text-red-200 py-2 rounded-lg font-medium transition-all text-sm"
                        >
                          Cancel Listing
                        </button>
                      ) : nft.isMinted ? (
                        <Link
                          href={`/nft/${nft.id}?action=list`}
                          className="flex-1 bg-black/30 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white py-2 rounded-lg font-medium transition-all text-center text-sm"
                        >
                          List for Sale
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleMintNFT(nft.id)}
                          disabled={mintingNFTs.has(nft.id)}
                          className="flex-1 bg-green-500/20 border border-green-500/30 hover:border-green-400/50 text-green-300 hover:text-green-200 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {mintingNFTs.has(nft.id) ? 'Minting...' : 'Mint NFT'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
