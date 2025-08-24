// AI角色评价系统类型定义

export interface AIPersonaReview {
  id: number;
  persona_id: number;
  reviewer_id: number;
  reviewer_wallet: string;
  reviewer_name?: string;
  rating: number; // 1-5星
  comment?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: Date;
  updated_at: Date;
  
  // 用户是否已投票有用性
  user_voted_helpful?: boolean;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    [key: number]: number; // 1-5星的数量分布
  };
  verified_purchase_count: number;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface ReviewFilters {
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'rating' | 'helpful_count';
  sort_order?: 'ASC' | 'DESC';
  verified_only?: boolean;
  rating_filter?: number; // 只显示特定星级的评价
}

export interface ReviewResponse {
  success: boolean;
  data?: {
    reviews: AIPersonaReview[];
    stats: ReviewStats;
    total_count: number;
  };
  error?: string;
}