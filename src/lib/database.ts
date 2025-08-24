import { Pool } from 'pg';

// 更健壮地构建连接字符串：如果DATABASE_URL缺少密码，则从DATABASE_PASSWORD补全；否则使用默认值
const DEFAULT_CONNECTION = 'postgresql://postgres:persona123@localhost:5432/persona_fi';
const mask = (s: string) => s.replace(/(postgresql:\/\/[^:]+):[^@]+@/, '$1:****@');
function buildConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw || raw.trim() === '') return DEFAULT_CONNECTION;
  try {
    const u = new URL(raw);
    if (!u.password || u.password.length === 0) {
      const pwd = process.env.DATABASE_PASSWORD || 'persona123';
      // Node URL will keep username; set password
      u.password = pwd;
      return u.toString();
    }
    return raw;
  } catch {
    return DEFAULT_CONNECTION;
  }
}
const connectionString = buildConnectionString();
console.log('🗄️ 使用数据库连接:', mask(connectionString));

// 创建数据库连接池
const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试数据库连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
});

// 测试连接
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('🔗 数据库连接池测试成功');
    client.release();
  } catch (err) {
    console.error('❌ 数据库连接池测试失败:', err);
  }
}

// 启动时测试连接
testConnection();

export interface User {
  id: number;
  wallet_address: string;
  email?: string;
  name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AIPersona {
  id: number;
  creator_id: number;
  name: string;
  personality_type: string;
  risk_level: string;
  specialization?: string;
  description?: string;
  avatar_url?: string;
  avatar_ipfs_hash?: string;
  training_data?: any;
  nft_mint_address?: string;
  is_minted: boolean;
  is_listed: boolean;
  price?: number;
  created_at: Date;
  updated_at: Date;
}

export interface TrainingSession {
  id: number;
  persona_id: number;
  user_message: string;
  ai_response: string;
  session_type: string;
  created_at: Date;
}

export interface MarketplaceListing {
  id: number;
  persona_id: number;
  seller_id: number;
  listing_type: 'sale' | 'rental';
  price?: number;
  rental_price_per_day?: number;
  min_rental_days?: number;
  max_rental_days?: number;
  nft_mint_address: string;
  metadata_uri?: string;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MarketplaceTransaction {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  persona_id: number;
  transaction_type: 'purchase' | 'rental';
  price: number;
  platform_fee?: number;
  creator_royalty?: number;
  transaction_signature?: string;
  rental_start_date?: Date;
  rental_end_date?: Date;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: Date;
  updated_at: Date;
}

class Database {
  // 通用查询方法
  static async query(text: string, params?: any[]) {
    return await pool.query(text, params);
  }

  // 用户相关操作
  static async createUser(walletAddress: string, email?: string, name?: string): Promise<User> {
    const query = `
      INSERT INTO users (wallet_address, email, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        email = COALESCE(EXCLUDED.email, users.email),
        name = COALESCE(EXCLUDED.name, users.name),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [walletAddress, email, name];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getUserByWallet(walletAddress: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    const result = await pool.query(query, [walletAddress]);
    return result.rows[0] || null;
  }

  static async getUserById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // AI角色相关操作
  static async createAIPersona(data: {
    creator_id: number;
    name: string;
    personality_type: string;
    risk_level: string;
    specialization?: string;
    description?: string;
    avatar_url?: string;
    avatar_ipfs_hash?: string;
    training_data?: any;
  }): Promise<AIPersona> {
    const query = `
      INSERT INTO ai_personas (
        creator_id, name, personality_type, risk_level, 
        specialization, description, avatar_url, avatar_ipfs_hash, training_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.creator_id,
      data.name,
      data.personality_type,
      data.risk_level,
      data.specialization,
      data.description,
      data.avatar_url,
      data.avatar_ipfs_hash,
      JSON.stringify(data.training_data || {})
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateAIPersonaNFT(
    personaId: number, 
    nftMintAddress: string, 
    isMinted: boolean = true
  ): Promise<AIPersona> {
    const query = `
      UPDATE ai_personas 
      SET nft_mint_address = $1, is_minted = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const values = [nftMintAddress, isMinted, personaId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAIPersonaById(id: number): Promise<AIPersona | null> {
    const query = 'SELECT * FROM ai_personas WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // 根据名称获取AI角色
  static async getAIPersonaByName(name: string): Promise<AIPersona | null> {
    const query = 'SELECT * FROM ai_personas WHERE name = $1';
    const result = await pool.query(query, [name]);
    return result.rows[0] || null;
  }

  static async getAIPersonasByCreator(creatorId: number): Promise<AIPersona[]> {
    const query = 'SELECT * FROM ai_personas WHERE creator_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [creatorId]);
    return result.rows;
  }

  static async getUserAIPersonas(walletAddress: string): Promise<AIPersona[]> {
    const query = `
      SELECT ap.*
      FROM ai_personas ap
      JOIN users u ON ap.creator_id = u.id
      WHERE u.wallet_address = $1
      ORDER BY ap.created_at DESC
    `;
    const result = await pool.query(query, [walletAddress]);
    return result.rows;
  }

  static async getAllAIPersonas(limit: number = 50, offset: number = 0): Promise<AIPersona[]> {
    const query = `
      SELECT ap.*, u.wallet_address as creator_wallet 
      FROM ai_personas ap 
      JOIN users u ON ap.creator_id = u.id 
      ORDER BY ap.created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // 训练对话相关操作
  static async addTrainingSession(
    personaId: number,
    userMessage: string,
    aiResponse: string,
    sessionType: string = 'training'
  ): Promise<TrainingSession> {
    const query = `
      INSERT INTO ai_training_sessions (persona_id, user_message, ai_response, session_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [personaId, userMessage, aiResponse, sessionType];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getTrainingSessionsByPersona(personaId: number): Promise<TrainingSession[]> {
    const query = `
      SELECT * FROM ai_training_sessions 
      WHERE persona_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [personaId]);
    return result.rows;
  }

  // 健康检查
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      console.error('数据库健康检查失败:', error);
      return false;
    }
  }

  // 关闭连接池
  // 个性化档案相关操作
  static async savePersonalityProfile(
    personaId: number,
    profile: {
      riskTolerance: string;
      investmentStyle: string;
      decisionPatterns: string;
      stopLossStrategy: string;
      positionManagement: string;
      marketAnalysisPreference: string;
      emotionalControl: string;
      timeHorizon: string;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO ai_personality_profiles (
        persona_id, risk_tolerance, investment_style, decision_patterns,
        stop_loss_strategy, position_management, market_analysis_preference,
        emotional_control, time_horizon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (persona_id) DO UPDATE SET
        risk_tolerance = EXCLUDED.risk_tolerance,
        investment_style = EXCLUDED.investment_style,
        decision_patterns = EXCLUDED.decision_patterns,
        stop_loss_strategy = EXCLUDED.stop_loss_strategy,
        position_management = EXCLUDED.position_management,
        market_analysis_preference = EXCLUDED.market_analysis_preference,
        emotional_control = EXCLUDED.emotional_control,
        time_horizon = EXCLUDED.time_horizon,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      personaId,
      profile.riskTolerance,
      profile.investmentStyle,
      profile.decisionPatterns,
      profile.stopLossStrategy,
      profile.positionManagement,
      profile.marketAnalysisPreference,
      profile.emotionalControl,
      profile.timeHorizon
    ];

    await pool.query(query, values);
  }

  static async getPersonalityProfile(personaId: number): Promise<any | null> {
    const query = `
      SELECT * FROM ai_personality_profiles WHERE persona_id = $1
    `;

    const result = await pool.query(query, [personaId]);
    return result.rows[0] || null;
  }

  // ============ 市场功能相关方法 ============

  // 创建市场列表
  static async createMarketplaceListing(listing: {
    persona_id: number;
    seller_id: number;
    listing_type: 'sale' | 'rental';
    price?: number;
    rental_price_per_day?: number;
    min_rental_days?: number;
    max_rental_days?: number;
    nft_mint_address: string;
    metadata_uri?: string;
    expires_at?: Date;
  }): Promise<MarketplaceListing> {
    const query = `
      INSERT INTO marketplace_listings (
        persona_id, seller_id, listing_type, price,
        rental_price_per_day, min_rental_days, max_rental_days,
        nft_mint_address, metadata_uri, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      listing.persona_id,
      listing.seller_id,
      listing.listing_type,
      listing.price,
      listing.rental_price_per_day,
      listing.min_rental_days,
      listing.max_rental_days,
      listing.nft_mint_address,
      listing.metadata_uri,
      listing.expires_at
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 获取市场列表
  static async getMarketplaceListings(filters: {
    status?: string;
    listing_type?: string;
    personality_type?: string;
    min_price?: number;
    max_price?: number;
  } = {}, options: {
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  } = {}): Promise<MarketplaceListing[]> {
    let query = `
      SELECT
        ml.*,
        ap.name as persona_name,
        ap.personality_type,
        ap.risk_level,
        ap.avatar_url,
        ap.description,
        u.wallet_address as seller_wallet
      FROM marketplace_listings ml
      JOIN ai_personas ap ON ml.persona_id = ap.id
      JOIN users u ON ml.seller_id = u.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 0;

    // 添加过滤条件
    if (filters.status) {
      query += ` AND ml.status = $${++paramCount}`;
      values.push(filters.status);
    }

    if (filters.listing_type) {
      query += ` AND ml.listing_type = $${++paramCount}`;
      values.push(filters.listing_type);
    }

    if (filters.personality_type) {
      query += ` AND ap.personality_type = $${++paramCount}`;
      values.push(filters.personality_type);
    }

    if (filters.min_price) {
      query += ` AND ml.price >= $${++paramCount}`;
      values.push(filters.min_price);
    }

    if (filters.max_price) {
      query += ` AND ml.price <= $${++paramCount}`;
      values.push(filters.max_price);
    }

    // 添加排序
    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'DESC';
    query += ` ORDER BY ml.${sortBy} ${sortOrder}`;

    // 添加分页
    if (options.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${++paramCount}`;
      values.push(options.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  // 根据ID获取市场列表
  static async getMarketplaceListingById(id: number): Promise<MarketplaceListing | null> {
    const query = `
      SELECT
        ml.*,
        ap.name as persona_name,
        ap.personality_type,
        ap.risk_level,
        ap.avatar_url,
        ap.description,
        u.wallet_address as seller_wallet
      FROM marketplace_listings ml
      JOIN ai_personas ap ON ml.persona_id = ap.id
      JOIN users u ON ml.seller_id = u.id
      WHERE ml.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // 根据用户获取市场列表
  static async getMarketplaceListingsBySeller(sellerId: number): Promise<MarketplaceListing[]> {
    const query = `
      SELECT
        ml.*,
        ap.name as persona_name,
        ap.personality_type,
        ap.risk_level,
        ap.avatar_url,
        ap.description
      FROM marketplace_listings ml
      JOIN ai_personas ap ON ml.persona_id = ap.id
      WHERE ml.seller_id = $1
      ORDER BY ml.created_at DESC
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows;
  }

  // 根据persona获取市场列表
  static async getMarketplaceListingsByPersona(personaId: number): Promise<MarketplaceListing[]> {
    const query = `
      SELECT
        ml.*,
        ap.name as persona_name,
        ap.personality_type,
        ap.risk_level,
        ap.avatar_url,
        ap.description
      FROM marketplace_listings ml
      JOIN ai_personas ap ON ml.persona_id = ap.id
      WHERE ml.persona_id = $1
      ORDER BY ml.created_at DESC
    `;

    const result = await pool.query(query, [personaId]);
    return result.rows;
  }

  // 更新市场列表状态
  static async updateMarketplaceListingStatus(id: number, status: string): Promise<MarketplaceListing | null> {
    const query = `
      UPDATE marketplace_listings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  // 创建交易记录
  static async createMarketplaceTransaction(transaction: {
    listing_id: number;
    buyer_id: number;
    seller_id: number;
    persona_id: number;
    transaction_type: 'purchase' | 'rental';
    price: number;
    platform_fee?: number;
    creator_royalty?: number;
    transaction_signature?: string;
    rental_start_date?: Date;
    rental_end_date?: Date;
    status?: string;
  }): Promise<MarketplaceTransaction> {
    const query = `
      INSERT INTO marketplace_transactions (
        listing_id, buyer_id, seller_id, persona_id, transaction_type,
        price, platform_fee, creator_royalty, transaction_signature,
        rental_start_date, rental_end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      transaction.listing_id,
      transaction.buyer_id,
      transaction.seller_id,
      transaction.persona_id,
      transaction.transaction_type,
      transaction.price,
      transaction.platform_fee,
      transaction.creator_royalty,
      transaction.transaction_signature,
      transaction.rental_start_date,
      transaction.rental_end_date,
      transaction.status || 'pending'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 获取用户的交易记录
  static async getUserTransactions(userId: number, type?: 'buyer' | 'seller'): Promise<MarketplaceTransaction[]> {
    let query = `
      SELECT
        mt.*,
        ml.nft_mint_address,
        ap.name as persona_name,
        ap.avatar_url,
        buyer.wallet_address as buyer_wallet,
        seller.wallet_address as seller_wallet
      FROM marketplace_transactions mt
      JOIN marketplace_listings ml ON mt.listing_id = ml.id
      JOIN ai_personas ap ON mt.persona_id = ap.id
      JOIN users buyer ON mt.buyer_id = buyer.id
      JOIN users seller ON mt.seller_id = seller.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 0;

    if (type === 'buyer') {
      query += ` AND mt.buyer_id = $${++paramCount}`;
      values.push(userId);
    } else if (type === 'seller') {
      query += ` AND mt.seller_id = $${++paramCount}`;
      values.push(userId);
    } else {
      query += ` AND (mt.buyer_id = $${++paramCount} OR mt.seller_id = $${++paramCount})`;
      values.push(userId, userId);
    }

    query += ` ORDER BY mt.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // 更新交易状态
  static async updateTransactionStatus(id: number, status: string): Promise<MarketplaceTransaction | null> {
    const query = `
      UPDATE marketplace_transactions
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  // ============ AI交易性能相关方法 ============

  // 记录AI交易
  static async recordAITrade(trade: {
    persona_id: number;
    token_symbol: string;
    token_mint_address: string;
    trade_type: 'buy' | 'sell';
    amount: number;
    price_sol: number;
    total_value_sol: number;
    is_profitable?: boolean;
    profit_loss_sol?: number;
    profit_loss_percentage?: number;
    transaction_signature?: string;
    market_cap_at_trade?: number;
    volume_24h_at_trade?: number;
  }): Promise<any> {
    const query = `
      INSERT INTO ai_trading_performance (
        persona_id, trade_date, token_symbol, token_mint_address, trade_type,
        amount, price_sol, total_value_sol, is_profitable, profit_loss_sol,
        profit_loss_percentage, transaction_signature, market_cap_at_trade, volume_24h_at_trade
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      trade.persona_id,
      trade.token_symbol,
      trade.token_mint_address,
      trade.trade_type,
      trade.amount,
      trade.price_sol,
      trade.total_value_sol,
      trade.is_profitable,
      trade.profit_loss_sol,
      trade.profit_loss_percentage,
      trade.transaction_signature,
      trade.market_cap_at_trade,
      trade.volume_24h_at_trade
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 获取AI性能汇总
  static async getAIPerformanceSummary(personaId?: number): Promise<any[]> {
    let query = `
      SELECT 
        aps.*,
        ap.name,
        ap.personality_type,
        ap.avatar_url,
        u.wallet_address as creator_wallet
      FROM ai_performance_summary aps
      JOIN ai_personas ap ON aps.persona_id = ap.id
      JOIN users u ON ap.creator_id = u.id
      WHERE ap.is_minted = true
    `;

    const values: any[] = [];
    if (personaId) {
      query += ` AND aps.persona_id = $1`;
      values.push(personaId);
    }

    query += ` ORDER BY aps.current_rank ASC NULLS LAST, aps.cumulative_return_percentage DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // 获取AI日性能数据
  static async getAIDailyPerformance(personaId: number, days: number = 30): Promise<any[]> {
    const query = `
      SELECT * FROM ai_performance_daily
      WHERE persona_id = $1 
      AND date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `;

    const result = await pool.query(query, [personaId]);
    return result.rows;
  }

  // 获取AI交易历史
  static async getAITradingHistory(personaId: number, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM ai_trading_performance
      WHERE persona_id = $1
      ORDER BY executed_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [personaId, limit]);
    return result.rows;
  }

  // 更新排名
  static async updatePerformanceRanks(): Promise<void> {
    const query = `
      WITH ranked_personas AS (
        SELECT 
          persona_id,
          ROW_NUMBER() OVER (
            ORDER BY 
              cumulative_return_percentage DESC,
              total_volume_sol DESC,
              (total_winning_trades::DECIMAL / NULLIF(total_trades, 0)) DESC
          ) as new_rank
        FROM ai_performance_summary
        WHERE total_trades > 0
      )
      UPDATE ai_performance_summary 
      SET 
        previous_rank = current_rank,
        current_rank = ranked_personas.new_rank,
        rank_change = COALESCE(current_rank, 0) - ranked_personas.new_rank,
        updated_at = CURRENT_TIMESTAMP
      FROM ranked_personas
      WHERE ai_performance_summary.persona_id = ranked_personas.persona_id
    `;

    await pool.query(query);
  }

  // ==================== 评价系统相关方法 ====================

  // 创建或更新评价
  static async createReview(data: {
    persona_id: number;
    reviewer_id: number;
    rating: number;
    comment?: string;
    is_verified_purchase?: boolean;
  }) {
    const query = `
      INSERT INTO ai_persona_reviews (
        persona_id, reviewer_id, rating, comment, is_verified_purchase
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (persona_id, reviewer_id) 
      DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      data.persona_id,
      data.reviewer_id,
      data.rating,
      data.comment || null,
      data.is_verified_purchase || false
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 获取AI角色的所有评价
  static async getPersonaReviews(
    personaId: number, 
    options: {
      limit?: number;
      offset?: number;
      sort_by?: 'created_at' | 'rating' | 'helpful_count';
      sort_order?: 'ASC' | 'DESC';
      verified_only?: boolean;
      rating_filter?: number;
    } = {}
  ) {
    let query = `
      SELECT 
        r.*,
        u.wallet_address as reviewer_wallet,
        u.name as reviewer_name
      FROM ai_persona_reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.persona_id = $1
    `;
    
    const values: any[] = [personaId];
    let paramCount = 1;
    
    if (options.verified_only) {
      query += ` AND r.is_verified_purchase = true`;
    }
    
    if (options.rating_filter) {
      query += ` AND r.rating = $${++paramCount}`;
      values.push(options.rating_filter);
    }
    
    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'DESC';
    query += ` ORDER BY r.${sortBy} ${sortOrder}`;
    
    if (options.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(options.limit);
    }
    
    if (options.offset) {
      query += ` OFFSET $${++paramCount}`;
      values.push(options.offset);
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  // 获取评价统计
  static async getReviewStats(personaId: number) {
    const query = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating)::DECIMAL(3,2) as average_rating,
        COUNT(*) FILTER (WHERE is_verified_purchase = true) as verified_purchase_count,
        COUNT(*) FILTER (WHERE rating = 1) as rating_1,
        COUNT(*) FILTER (WHERE rating = 2) as rating_2,
        COUNT(*) FILTER (WHERE rating = 3) as rating_3,
        COUNT(*) FILTER (WHERE rating = 4) as rating_4,
        COUNT(*) FILTER (WHERE rating = 5) as rating_5
      FROM ai_persona_reviews
      WHERE persona_id = $1
    `;
    
    const result = await pool.query(query, [personaId]);
    const row = result.rows[0];
    
    return {
      total_reviews: parseInt(row.total_reviews),
      average_rating: parseFloat(row.average_rating) || 0,
      verified_purchase_count: parseInt(row.verified_purchase_count),
      rating_distribution: {
        1: parseInt(row.rating_1),
        2: parseInt(row.rating_2),
        3: parseInt(row.rating_3),
        4: parseInt(row.rating_4),
        5: parseInt(row.rating_5)
      }
    };
  }

  // 检查用户是否已购买该AI角色
  static async hasUserPurchasedPersona(userId: number, personaId: number): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM marketplace_transactions mt
      WHERE mt.buyer_id = $1 
        AND mt.persona_id = $2 
        AND mt.status = 'completed'
    `;
    
    const result = await pool.query(query, [userId, personaId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // 投票评价有用性
  static async voteReviewHelpfulness(
    reviewId: number, 
    userId: number, 
    isHelpful: boolean
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 插入或更新投票
      await client.query(`
        INSERT INTO review_helpfulness (review_id, user_id, is_helpful)
        VALUES ($1, $2, $3)
        ON CONFLICT (review_id, user_id)
        DO UPDATE SET is_helpful = EXCLUDED.is_helpful
      `, [reviewId, userId, isHelpful]);
      
      // 更新评价的有用计数
      await client.query(`
        UPDATE ai_persona_reviews 
        SET helpful_count = (
          SELECT COUNT(*) 
          FROM review_helpfulness 
          WHERE review_id = $1 AND is_helpful = true
        )
        WHERE id = $1
      `, [reviewId]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 获取用户对评价的投票状态
  static async getUserReviewVote(reviewId: number, userId: number): Promise<boolean | null> {
    const query = `
      SELECT is_helpful 
      FROM review_helpfulness 
      WHERE review_id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [reviewId, userId]);
    return result.rows.length > 0 ? result.rows[0].is_helpful : null;
  }

  // 删除评价
  static async deleteReview(reviewId: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM ai_persona_reviews 
      WHERE id = $1 AND reviewer_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [reviewId, userId]);
    return result.rows.length > 0;
  }

  static async close(): Promise<void> {
    await pool.end();
  }
}

export default Database;
