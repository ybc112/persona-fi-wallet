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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_personas_creator ON ai_personas(creator_id);
CREATE INDEX IF NOT EXISTS idx_personas_type ON ai_personas(personality_type);
CREATE INDEX IF NOT EXISTS idx_training_persona ON ai_training_sessions(persona_id);

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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_persona ON marketplace_listings(persona_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type ON marketplace_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);

-- 插入测试数据
INSERT INTO users (wallet_address, email, name) VALUES
('0x1234567890123456789012345678901234567890', 'test@example.com', 'Test User')
ON CONFLICT (wallet_address) DO NOTHING;
