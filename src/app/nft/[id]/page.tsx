'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { Navbar } from '@/components/Navbar';
import ListingModal from '@/components/ListingModal';
import NFTMintSuccessModal from '@/components/NFTMintSuccessModal';
import PurchaseModal from '@/components/PurchaseModal';
import PurchaseSuccessModal from '@/components/PurchaseSuccessModal';
import ReviewSection from '@/components/ReviewSection';
import Link from 'next/link';

interface NFTDetails {
  id: number;
  name: string;
  personalityType: string;
  riskLevel: string;
  specialization?: string;
  description?: string;
  avatarUrl?: string;
  nftMintAddress?: string;
  isMinted: boolean;
  isListed: boolean;
  price?: number;
  createdAt: string;
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
  createdAt: string;
}

export default function NFTDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isConnected, login } = useWeb3Auth();
  const { publicKey } = useSolanaWallet();
  
  const [nftDetails, setNftDetails] = useState<NFTDetails | null>(null);
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [minting, setMinting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintSuccessData, setMintSuccessData] = useState<{
    name: string;
    mintAddress: string;
    transactionSignature: string;
    avatarUrl?: string;
    metadataUri?: string;
  } | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPurchaseSuccessModal, setShowPurchaseSuccessModal] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<{
    nftName: string;
    purchaseType: 'buy' | 'rent';
    price: number;
    transactionSignature: string;
    rentalDays?: number;
    expiryDate?: string;
    avatarUrl?: string;
  } | null>(null);

  const action = searchParams?.get('action');

  useEffect(() => {
    if (params?.id) {
      fetchNFTDetails(params.id as string);
    }
  }, [params?.id]);

  useEffect(() => {
    if (action === 'list' && isConnected && nftDetails?.isMinted) {
      setShowListModal(true);
    }
  }, [action, isConnected, nftDetails]);

  const fetchNFTDetails = async (personaId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/persona/${personaId}`);
      const result = await response.json();

      if (result.success) {
        setNftDetails(result.persona);
        
        // 如果已上架，获取上架信息
        if (result.persona.isListed) {
          fetchListingDetails(parseInt(personaId));
        }
      } else {
        setError(result.error || 'Failed to load NFT details');
      }
    } catch (error) {
      console.error('获取NFT详情失败:', error);
      setError('Failed to load NFT details');
    } finally {
      setLoading(false);
    }
  };

  const fetchListingDetails = async (personaId: number) => {
    try {
      const response = await fetch(`/api/marketplace/nft/${personaId}`);
      const result = await response.json();

      if (result.success && result.listing) {
        setListing(result.listing);
      }
    } catch (error) {
      console.error('获取上架信息失败:', error);
    }
  };

  const handleUsePersona = () => {
    // 跳转到AI分析页面或聊天页面
    router.push(`/chat/${params.id}`);
  };

  const handleViewOnExplorer = () => {
    if (nftDetails?.nftMintAddress) {
      window.open(`https://explorer.solana.com/address/${nftDetails.nftMintAddress}?cluster=devnet`, '_blank');
    }
  };

  const handleListSuccess = () => {
    setShowListModal(false);
    // 刷新NFT详情
    fetchNFTDetails(params.id as string);
  };

  const handleCancelListing = async () => {
    if (!publicKey || !listing) return;

    try {
      const response = await fetch(
        `/api/marketplace/list?listingId=${listing.id}&walletAddress=${publicKey}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        // 刷新NFT详情
        fetchNFTDetails(params.id as string);
        alert('上架已取消');
      } else {
        alert(result.error || '取消上架失败');
      }
    } catch (error) {
      console.error('取消上架失败:', error);
      alert('取消上架失败');
    }
  };

  const handleMintNFT = async () => {
    if (!publicKey || !nftDetails) return;

    try {
      setMinting(true);
      setError(null);

      console.log('🎨 开始铸造NFT:', { personaId: nftDetails.id });

      const response = await fetch('/api/nft/mint-umi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          personaId: nftDetails.id
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ NFT铸造成功:', result);

        // 设置成功模态框数据
        setMintSuccessData({
          name: nftDetails?.name || 'AI Persona',
          mintAddress: result.mintAddress,
          transactionSignature: result.transactionSignature || 'pending',
          avatarUrl: nftDetails?.avatarUrl,
          metadataUri: result.metadataUri
        });
        setShowSuccessModal(true);

        // 刷新NFT详情
        fetchNFTDetails(params.id as string);
      } else {
        setError(result.error || 'NFT铸造失败');
        alert(result.error || 'NFT铸造失败');
      }
    } catch (error: any) {
      console.error('❌ NFT铸造失败:', error);
      setError(error.message || 'NFT铸造失败');
      alert(error.message || 'NFT铸造失败');
    } finally {
      setMinting(false);
    }
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    // 刷新NFT详情
    fetchNFTDetails(params.id as string);
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
    // 刷新NFT详情
    fetchNFTDetails(params.id as string);
  };

  const isOwner = isConnected && publicKey && nftDetails &&
    publicKey === nftDetails.creatorWallet;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-purple-200">Loading NFT details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !nftDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-4">NFT Not Found</h2>
            <p className="text-purple-200 mb-8">{error || 'The requested NFT could not be found.'}</p>
            <Link 
              href="/my-nfts"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              Back to My NFTs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 返回按钮 */}
        <div className="mb-8">
          <Link 
            href="/my-nfts"
            className="inline-flex items-center text-purple-300 hover:text-white transition-colors"
          >
            ← Back to My NFTs
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* 左侧：NFT图片和基本信息 */}
          <div className="space-y-6">
            {/* NFT图片 */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
              <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-8xl overflow-hidden">
                {nftDetails.avatarUrl ? (
                  <img 
                    src={nftDetails.avatarUrl} 
                    alt={nftDetails.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  '🤖'
                )}
              </div>
            </div>

            {/* 状态信息 */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">Minted</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    nftDetails.isMinted 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {nftDetails.isMinted ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">Listed</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    listing 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {listing ? 'Yes' : 'No'}
                  </span>
                </div>

                {nftDetails.nftMintAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300">Mint Address</span>
                    <button
                      onClick={handleViewOnExplorer}
                      className="text-blue-400 hover:text-blue-300 text-sm font-mono truncate max-w-32"
                    >
                      {nftDetails.nftMintAddress.slice(0, 8)}...
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 上架信息 */}
            {listing && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Listing Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-300">Type</span>
                    <span className="text-white capitalize">{listing.listingType}</span>
                  </div>
                  
                  {listing.price && (
                    <div className="flex justify-between">
                      <span className="text-purple-300">Price</span>
                      <span className="text-white font-bold">{listing.price} SOL</span>
                    </div>
                  )}
                  
                  {listing.rentalPricePerDay && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Daily Rate</span>
                        <span className="text-white font-bold">{listing.rentalPricePerDay} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Rental Period</span>
                        <span className="text-white">{listing.minRentalDays}-{listing.maxRentalDays} days</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：详细信息和操作 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
              <h1 className="text-4xl font-bold text-white mb-4">{nftDetails.name}</h1>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-purple-300 text-sm">Personality Type</div>
                  <div className="text-white font-medium">{nftDetails.personalityType}</div>
                </div>
                <div>
                  <div className="text-purple-300 text-sm">Risk Level</div>
                  <div className="text-white font-medium">{nftDetails.riskLevel}</div>
                </div>
                {nftDetails.specialization && (
                  <div className="col-span-2">
                    <div className="text-purple-300 text-sm">Specialization</div>
                    <div className="text-white font-medium">{nftDetails.specialization}</div>
                  </div>
                )}
              </div>

              {nftDetails.description && (
                <div className="mb-6">
                  <div className="text-purple-300 text-sm mb-2">Description</div>
                  <p className="text-gray-300 leading-relaxed">{nftDetails.description}</p>
                </div>
              )}

              <div className="text-purple-300 text-sm">
                Created: {new Date(nftDetails.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-6">Actions</h3>
              
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-purple-200 mb-4">Connect your wallet to interact with this NFT</p>
                  <button
                    onClick={login}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : isOwner ? (
                <div className="space-y-4">
                  {nftDetails.isMinted && (
                    <button
                      onClick={handleUsePersona}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-105"
                    >
                      Use AI Persona
                    </button>
                  )}
                  
                  {nftDetails.nftMintAddress && (
                    <button
                      onClick={handleViewOnExplorer}
                      className="w-full bg-black/30 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white py-3 rounded-lg font-medium transition-all"
                    >
                      View on Solana Explorer
                    </button>
                  )}

                  {!nftDetails.isMinted ? (
                    <button
                      onClick={handleMintNFT}
                      disabled={minting}
                      className="w-full bg-green-500/20 border border-green-500/30 hover:border-green-400/50 text-green-300 hover:text-green-200 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {minting ? 'Minting...' : 'Mint NFT'}
                    </button>
                  ) : listing ? (
                    <button
                      onClick={handleCancelListing}
                      className="w-full bg-red-500/20 border border-red-500/30 hover:border-red-400/50 text-red-300 hover:text-red-200 py-3 rounded-lg font-medium transition-all"
                    >
                      Cancel Listing
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowListModal(true)}
                      className="w-full bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 py-3 rounded-lg font-medium transition-all"
                    >
                      List for Sale
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-purple-200 mb-4">This NFT belongs to another user</p>
                  {listing && listing.status === 'active' && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowPurchaseModal(true)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-105"
                      >
                        {listing.listingType === 'sale' ? 'Buy Now' : 'Rent Now'}
                      </button>

                      {/* Price Display */}
                      <div className="text-sm text-purple-300">
                        {listing.price && (
                          <div>Purchase Price: {listing.price} SOL</div>
                        )}
                        {listing.rentalPricePerDay && (
                          <div>Rental: {listing.rentalPricePerDay} SOL/day</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 评论区 */}
        <div className="mt-12">
          <ReviewSection 
            personaId={nftDetails.id} 
            isOwner={isOwner || false} 
          />
        </div>
      </div>

      {/* Listing Modal */}
      {showListModal && nftDetails && (
        <ListingModal
          isOpen={showListModal}
          onClose={() => setShowListModal(false)}
          onSuccess={handleListSuccess}
          nftDetails={{
            id: nftDetails.id,
            name: nftDetails.name,
            personalityType: nftDetails.personalityType,
            avatarUrl: nftDetails.avatarUrl
          }}
        />
      )}

      {/* NFT Mint Success Modal */}
      {showSuccessModal && mintSuccessData && (
        <NFTMintSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          nftData={mintSuccessData}
        />
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && nftDetails && listing && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseComplete}
          nftDetails={nftDetails}
          listing={listing}
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
