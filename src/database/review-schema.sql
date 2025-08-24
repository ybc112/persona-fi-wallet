-- AI角色评价系统数据库表结构

-- AI角色评价表
CREATE TABLE IF NOT EXISTS ai_persona_reviews (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE, -- 是否为已购买用户
    helpful_count INTEGER DEFAULT 0, -- 有用投票数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 防止重复评价
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

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_reviews_persona ON ai_persona_reviews(persona_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON ai_persona_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON ai_persona_reviews(is_verified_purchase);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON ai_persona_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_helpfulness_review ON review_helpfulness(review_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_persona_reviews_updated_at 
    BEFORE UPDATE ON ai_persona_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入一些测试数据
INSERT INTO ai_persona_reviews (persona_id, reviewer_id, rating, comment, is_verified_purchase) VALUES
(1, 1, 5, '这个AI角色的交易策略非常出色，帮我获得了不错的收益！推荐给所有DeFi爱好者。', true),
(1, 2, 4, '表现稳定，风险控制做得很好，就是有时候反应稍微慢一点。', true),
(2, 1, 3, '还可以，但是感觉策略比较保守，收益率一般。', false),
(2, 3, 5, '非常满意！这个AI在市场波动中表现出色，值得信赖。', true)
ON CONFLICT (persona_id, reviewer_id) DO NOTHING;