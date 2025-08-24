'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import type { AIPersonaReview, ReviewStats } from '@/types/review';

interface ReviewSectionProps {
  personaId: number;
  isOwner: boolean;
}

export default function ReviewSection({ personaId, isOwner }: ReviewSectionProps) {
  const { isConnected } = useWeb3Auth();
  const { publicKey } = useSolanaWallet();
  const [reviews, setReviews] = useState<AIPersonaReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({
    verified_only: false,
    rating_filter: 0,
    sort_by: 'created_at' as 'created_at' | 'rating' | 'helpful_count'
  });

  useEffect(() => {
    fetchReviews();
  }, [personaId, filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '20',
        offset: '0',
        sort_by: filter.sort_by,
        sort_order: 'DESC',
        ...(filter.verified_only && { verified_only: 'true' }),
        ...(filter.rating_filter > 0 && { rating_filter: filter.rating_filter.toString() })
      });

      const response = await fetch(`/api/reviews/${personaId}?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setReviews(result.data.reviews);
        setStats(result.data.stats);
      } else {
        console.error('获取评价失败:', result.error);
      }
    } catch (error) {
      console.error('获取评价失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isConnected || !publicKey || submitting) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/reviews/${personaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey,
          rating: newReview.rating,
          comment: newReview.comment.trim() || null
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowReviewForm(false);
        setNewReview({ rating: 5, comment: '' });
        fetchReviews(); // 刷新评价列表
        alert('评价提交成功！');
      } else {
        alert(result.error || '评价提交失败');
      }
    } catch (error) {
      console.error('提交评价失败:', error);
      alert('评价提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteHelpful = async (reviewId: number, isHelpful: boolean) => {
    if (!isConnected || !publicKey) return;
    
    try {
      const response = await fetch(`/api/reviews/vote/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey,
          isHelpful
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchReviews(); // 刷新评价列表以更新投票数
      } else {
        alert(result.error || '投票失败');
      }
    } catch (error) {
      console.error('投票失败:', error);
      alert('投票失败');
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRate?.(star)}
            className={`text-2xl ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-600'
            } ${interactive ? 'hover:text-yellow-300 cursor-pointer transition-colors' : ''}`}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">用户评价</h3>
        
        {isConnected && !isOwner && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            写评价
          </button>
        )}
      </div>

      {/* 评价统计 */}
      {stats && stats.total_reviews > 0 && (
        <div className="mb-8 p-6 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <div className="flex items-center space-x-8 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{stats.average_rating.toFixed(1)}</div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(stats.average_rating))}
              </div>
              <div className="text-purple-300 text-sm">{stats.total_reviews} 条评价</div>
            </div>
            
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-3 mb-1">
                  <span className="text-purple-300 text-sm w-8">{rating}星</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${stats.total_reviews > 0 ? (stats.rating_distribution[rating] / stats.total_reviews) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-purple-300 text-sm w-8">{stats.rating_distribution[rating]}</span>
                </div>
              ))}
            </div>
          </div>
          
          {stats.verified_purchase_count > 0 && (
            <div className="text-green-300 text-sm flex items-center">
              <span className="mr-2">✓</span>
              {stats.verified_purchase_count} 条来自已购买用户的评价
            </div>
          )}
        </div>
      )}

      {/* 筛选选项 */}
      {stats && stats.total_reviews > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filter.sort_by}
            onChange={(e) => setFilter(prev => ({ ...prev, sort_by: e.target.value as any }))}
            className="bg-black/30 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none"
          >
            <option value="created_at">最新评价</option>
            <option value="rating">评分排序</option>
            <option value="helpful_count">最有用</option>
          </select>

          <select
            value={filter.rating_filter}
            onChange={(e) => setFilter(prev => ({ ...prev, rating_filter: parseInt(e.target.value) }))}
            className="bg-black/30 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none"
          >
            <option value={0}>所有评分</option>
            <option value={5}>5星</option>
            <option value={4}>4星</option>
            <option value={3}>3星</option>
            <option value={2}>2星</option>
            <option value={1}>1星</option>
          </select>

          <label className="flex items-center space-x-2 text-purple-300 text-sm">
            <input
              type="checkbox"
              checked={filter.verified_only}
              onChange={(e) => setFilter(prev => ({ ...prev, verified_only: e.target.checked }))}
              className="rounded border-purple-500/30 bg-black/30 text-purple-500 focus:ring-purple-500"
            />
            <span>仅显示已购买用户评价</span>
          </label>
        </div>
      )}

      {/* 评价表单 */}
      {showReviewForm && (
        <div className="mb-8 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <h4 className="text-lg font-bold text-white mb-4">写下你的评价</h4>
          
          <div className="mb-4">
            <label className="block text-purple-300 text-sm mb-2">评分</label>
            {renderStars(newReview.rating, true, (rating) => 
              setNewReview(prev => ({ ...prev, rating }))
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-purple-300 text-sm mb-2">评价内容（可选）</label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="分享你使用这个AI角色的体验..."
              className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-400 focus:border-purple-400 focus:outline-none resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="text-right text-purple-400 text-xs mt-1">
              {newReview.comment.length}/500
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-all"
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>
            <button
              onClick={() => setShowReviewForm(false)}
              disabled={submitting}
              className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 评价列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            <p className="text-purple-200 mt-2">加载评价中...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-purple-300">
              {filter.verified_only || filter.rating_filter > 0 
                ? '没有符合条件的评价' 
                : '暂无评价，成为第一个评价的用户吧！'
              }
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={`review-${review.id}-${review.reviewer_id}`} className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {review.reviewer_name?.[0] || review.reviewer_wallet[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium flex items-center space-x-2">
                      <span>{review.reviewer_name || formatWallet(review.reviewer_wallet)}</span>
                      {review.is_verified_purchase && (
                        <span className="text-green-400 text-xs bg-green-400/20 px-2 py-1 rounded">✓ 已购买</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {renderStars(review.rating)}
                      <span className="text-purple-300 text-sm">
                        {formatDate(review.created_at.toString())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {review.comment && (
                <p className="text-gray-300 mb-3 leading-relaxed">{review.comment}</p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => handleVoteHelpful(review.id, true)}
                    disabled={!isConnected}
                    className="text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <span>👍</span>
                    <span>有用 ({review.helpful_count})</span>
                  </button>
                </div>
                
                {review.updated_at !== review.created_at && (
                  <span className="text-purple-400 text-xs">
                    已编辑
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 加载更多按钮 */}
      {reviews.length >= 20 && (
        <div className="text-center mt-6">
          <button className="text-purple-400 hover:text-purple-300 transition-colors">
            加载更多评价
          </button>
        </div>
      )}
    </div>
  );
}