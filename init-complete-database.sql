-- PersonaFi 完整数据库初始化脚本
-- 包含所有必要的表结构

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建AI角色表
CREATE TABLE IF NOT EXISTS ai_personas (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    personality_type VARCHAR(100) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    specialization VARCHAR(255),
    description TEXT,
    avatar_url TEXT,
    avatar_ipfs_hash VARCHAR(255),
    training_data JSONB,
    nft_mint_address VARCHAR(255),
    is_minted BOOLEAN DEFAULT FALSE,
    is_listed BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建训练对话表
CREATE TABLE IF NOT EXISTS ai_training_sessions (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id),
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    session_type VARCHAR(50) DEFAULT 'training',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建市场列表表
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('sale', 'rental')),
    price DECIMAL(10,4), -- 出售价格 (SOL)
    rental_price_per_day DECIMAL(10,4), -- 每日租赁价格 (SOL)
    min_rental_days INTEGER DEFAULT 1,
    max_rental_days INTEGER DEFAULT 30,
    nft_mint_address VARCHAR(255) NOT NULL,
    metadata_uri TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建市场交易表
CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'rental')),
    price DECIMAL(10,4) NOT NULL,
    platform_fee DECIMAL(10,4) DEFAULT 0,
    creator_royalty DECIMAL(10,4) DEFAULT 0,
    transaction_signature VARCHAR(255),
    rental_start_date TIMESTAMP,
    rental_end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI角色评价表
CREATE TABLE IF NOT EXISTS ai_persona_reviews (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(persona_id, reviewer_id)
);

-- 评价有用性投票表
CREATE TABLE IF NOT EXISTS review_helpfulness (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES ai_persona_reviews(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, user_id)
);

-- AI交易性能表
CREATE TABLE IF NOT EXISTS ai_trading_performance (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    token_mint_address VARCHAR(255),
    trade_type VARCHAR(10) CHECK (trade_type IN ('buy', 'sell')),
    amount DECIMAL(20,8),
    price_sol DECIMAL(15,8),
    total_value_sol DECIMAL(15,8),
    is_profitable BOOLEAN,
    profit_loss_sol DECIMAL(15,8),
    profit_loss_percentage DECIMAL(8,4),
    transaction_signature VARCHAR(255),
    market_cap_at_trade DECIMAL(20,2),
    volume_24h_at_trade DECIMAL(20,2),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI性能汇总表
CREATE TABLE IF NOT EXISTS ai_performance_summary (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    total_trades INTEGER DEFAULT 0,
    total_winning_trades INTEGER DEFAULT 0,
    total_losing_trades INTEGER DEFAULT 0,
    total_volume_sol DECIMAL(20,8) DEFAULT 0,
    cumulative_return_sol DECIMAL(20,8) DEFAULT 0,
    cumulative_return_percentage DECIMAL(8,4) DEFAULT 0,
    max_drawdown_percentage DECIMAL(8,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    current_rank INTEGER,
    previous_rank INTEGER,
    rank_change INTEGER DEFAULT 0,
    last_trade_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(persona_id)
);

-- AI日性能表
CREATE TABLE IF NOT EXISTS ai_performance_daily (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    daily_return_sol DECIMAL(15,8) DEFAULT 0,
    daily_return_percentage DECIMAL(8,4) DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    volume_sol DECIMAL(15,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(persona_id, date)
);

-- 创建所有索引
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_personas_creator ON ai_personas(creator_id);
CREATE INDEX IF NOT EXISTS idx_personas_type ON ai_personas(personality_type);
CREATE INDEX IF NOT EXISTS idx_personas_minted ON ai_personas(is_minted);
CREATE INDEX IF NOT EXISTS idx_training_persona ON ai_training_sessions(persona_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_persona ON marketplace_listings(persona_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type ON marketplace_listings(listing_type);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_persona ON marketplace_transactions(persona_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_created_at ON marketplace_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_reviews_persona ON ai_persona_reviews(persona_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON ai_persona_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON ai_persona_reviews(is_verified_purchase);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON ai_persona_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_helpfulness_review ON review_helpfulness(review_id);

CREATE INDEX IF NOT EXISTS idx_trading_performance_persona ON ai_trading_performance(persona_id);
CREATE INDEX IF NOT EXISTS idx_trading_performance_date ON ai_trading_performance(trade_date);
CREATE INDEX IF NOT EXISTS idx_performance_summary_persona ON ai_performance_summary(persona_id);
CREATE INDEX IF NOT EXISTS idx_performance_summary_rank ON ai_performance_summary(current_rank);
CREATE INDEX IF NOT EXISTS idx_performance_daily_persona_date ON ai_performance_daily(persona_id, date);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用触发器到相关表
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_personas_updated_at 
    BEFORE UPDATE ON ai_personas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at 
    BEFORE UPDATE ON marketplace_listings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_transactions_updated_at 
    BEFORE UPDATE ON marketplace_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_persona_reviews_updated_at 
    BEFORE UPDATE ON ai_persona_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_performance_summary_updated_at 
    BEFORE UPDATE ON ai_performance_summary 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始测试数据
INSERT INTO users (wallet_address, email, name) VALUES
('0x1234567890123456789012345678901234567890', 'test@example.com', 'Test User'),
('0x2345678901234567890123456789012345678901', 'alice@example.com', 'Alice'),
('0x3456789012345678901234567890123456789012', 'bob@example.com', 'Bob')
ON CONFLICT (wallet_address) DO NOTHING;

-- 插入测试AI角色
INSERT INTO ai_personas (creator_id, name, personality_type, risk_level, specialization, description, avatar_url, is_minted, is_listed, price) VALUES
(1, 'DeFi Master Alpha', 'DeFi Expert', 'High', 'Yield Farming & Liquidity Mining', 'An aggressive DeFi strategist focused on maximizing yields through advanced protocols.', 'https://api.dicebear.com/7.x/bottts/svg?seed=defi1', true, true, 5.5),
(1, 'Meme Coin Hunter', 'Meme Hunter', 'Very High', 'Early Stage Meme Detection', 'Specialized in identifying promising meme coins before they moon.', 'https://api.dicebear.com/7.x/bottts/svg?seed=meme1', true, true, 3.2),
(2, 'Conservative Wealth Builder', 'Conservative', 'Low', 'Stable Coin Strategies', 'Focus on capital preservation with steady, low-risk returns.', 'https://api.dicebear.com/7.x/bottts/svg?seed=conservative1', true, true, 2.8)
ON CONFLICT DO NOTHING;

COMMIT;