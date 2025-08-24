-- AI交易性能记录表
CREATE TABLE IF NOT EXISTS ai_trading_performance (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    trade_date DATE NOT NULL,
    
    -- 交易基本信息
    token_symbol VARCHAR(20) NOT NULL,
    token_mint_address VARCHAR(255) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    
    -- 交易数量和价格
    amount DECIMAL(20,8) NOT NULL,
    price_sol DECIMAL(20,8) NOT NULL,
    total_value_sol DECIMAL(20,8) NOT NULL,
    
    -- 交易结果
    is_profitable BOOLEAN,
    profit_loss_sol DECIMAL(20,8) DEFAULT 0,
    profit_loss_percentage DECIMAL(10,4) DEFAULT 0,
    
    -- 交易签名和时间
    transaction_signature VARCHAR(255) UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 市场数据
    market_cap_at_trade DECIMAL(20,2),
    volume_24h_at_trade DECIMAL(20,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI性能统计汇总表（按日汇总）
CREATE TABLE IF NOT EXISTS ai_performance_daily (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- 日交易统计
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    
    -- 收益统计
    total_profit_loss_sol DECIMAL(20,8) DEFAULT 0,
    total_volume_sol DECIMAL(20,8) DEFAULT 0,
    
    -- 计算字段
    win_rate DECIMAL(5,2) DEFAULT 0, -- 胜率百分比
    daily_return_percentage DECIMAL(10,4) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(persona_id, date)
);

-- AI整体性能统计表
CREATE TABLE IF NOT EXISTS ai_performance_summary (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES ai_personas(id) ON DELETE CASCADE,
    
    -- 总体统计
    total_trades INTEGER DEFAULT 0,
    total_winning_trades INTEGER DEFAULT 0,
    total_losing_trades INTEGER DEFAULT 0,
    
    -- 收益统计
    total_profit_loss_sol DECIMAL(20,8) DEFAULT 0,
    total_volume_sol DECIMAL(20,8) DEFAULT 0,
    cumulative_return_percentage DECIMAL(10,4) DEFAULT 0,
    
    -- 风险指标
    max_drawdown_percentage DECIMAL(10,4) DEFAULT 0,
    sharpe_ratio DECIMAL(10,4),
    
    -- 时间统计
    first_trade_at TIMESTAMP,
    last_trade_at TIMESTAMP,
    active_days INTEGER DEFAULT 0,
    
    -- 排名相关
    current_rank INTEGER,
    previous_rank INTEGER,
    rank_change INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(persona_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_trading_performance_persona ON ai_trading_performance(persona_id);
CREATE INDEX IF NOT EXISTS idx_trading_performance_date ON ai_trading_performance(trade_date);
CREATE INDEX IF NOT EXISTS idx_trading_performance_token ON ai_trading_performance(token_symbol);
CREATE INDEX IF NOT EXISTS idx_performance_daily_persona ON ai_performance_daily(persona_id);
CREATE INDEX IF NOT EXISTS idx_performance_daily_date ON ai_performance_daily(date);
CREATE INDEX IF NOT EXISTS idx_performance_summary_persona ON ai_performance_summary(persona_id);
CREATE INDEX IF NOT EXISTS idx_performance_summary_rank ON ai_performance_summary(current_rank);

-- 插入一些示例交易数据
INSERT INTO ai_trading_performance (
    persona_id, trade_date, token_symbol, token_mint_address, trade_type,
    amount, price_sol, total_value_sol, is_profitable, profit_loss_sol, 
    profit_loss_percentage, transaction_signature, market_cap_at_trade, volume_24h_at_trade
) VALUES 
-- AI Persona 1 的交易记录
(1, '2024-01-15', 'SOL', 'So11111111111111111111111111111111111111112', 'buy', 10.0, 100.0, 1000.0, true, 150.0, 15.0, 'tx_001_buy_sol', 50000000, 1000000),
(1, '2024-01-16', 'SOL', 'So11111111111111111111111111111111111111112', 'sell', 10.0, 115.0, 1150.0, true, 150.0, 15.0, 'tx_002_sell_sol', 52000000, 1200000),
(1, '2024-01-17', 'USDC', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'buy', 500.0, 0.2, 100.0, true, 25.0, 25.0, 'tx_003_buy_usdc', 30000000, 800000),
(1, '2024-01-18', 'USDC', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'sell', 500.0, 0.25, 125.0, true, 25.0, 25.0, 'tx_004_sell_usdc', 32000000, 900000),

-- AI Persona 2 的交易记录
(2, '2024-01-15', 'SOL', 'So11111111111111111111111111111111111111112', 'buy', 5.0, 100.0, 500.0, false, -50.0, -10.0, 'tx_005_buy_sol', 50000000, 1000000),
(2, '2024-01-16', 'SOL', 'So11111111111111111111111111111111111111112', 'sell', 5.0, 90.0, 450.0, false, -50.0, -10.0, 'tx_006_sell_sol', 48000000, 900000),
(2, '2024-01-17', 'BONK', '5P3giWpPBrVKL8QP8roKM7NsLdi3ie1Nc2b5r9mGtvwb', 'buy', 1000000.0, 0.00001, 10.0, true, 5.0, 50.0, 'tx_007_buy_bonk', 500000, 100000),
(2, '2024-01-18', 'BONK', '5P3giWpPBrVKL8QP8roKM7NsLdi3ie1Nc2b5r9mGtvwb', 'sell', 1000000.0, 0.000015, 15.0, true, 5.0, 50.0, 'tx_008_sell_bonk', 600000, 120000)

ON CONFLICT (transaction_signature) DO NOTHING;

-- 触发器：自动更新日统计
CREATE OR REPLACE FUNCTION update_daily_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- 插入或更新日统计
    INSERT INTO ai_performance_daily (
        persona_id, date, total_trades, winning_trades, losing_trades,
        total_profit_loss_sol, total_volume_sol
    )
    SELECT 
        NEW.persona_id,
        NEW.trade_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE is_profitable = true),
        COUNT(*) FILTER (WHERE is_profitable = false),
        SUM(profit_loss_sol),
        SUM(total_value_sol)
    FROM ai_trading_performance 
    WHERE persona_id = NEW.persona_id AND trade_date = NEW.trade_date
    GROUP BY persona_id, trade_date
    ON CONFLICT (persona_id, date) 
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        winning_trades = EXCLUDED.winning_trades,
        losing_trades = EXCLUDED.losing_trades,
        total_profit_loss_sol = EXCLUDED.total_profit_loss_sol,
        total_volume_sol = EXCLUDED.total_volume_sol,
        win_rate = CASE 
            WHEN EXCLUDED.total_trades > 0 
            THEN (EXCLUDED.winning_trades::DECIMAL / EXCLUDED.total_trades * 100)
            ELSE 0 
        END,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_performance
    AFTER INSERT ON ai_trading_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_performance();

-- 触发器：自动更新总体统计
CREATE OR REPLACE FUNCTION update_performance_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- 插入或更新总体统计
    INSERT INTO ai_performance_summary (
        persona_id, total_trades, total_winning_trades, total_losing_trades,
        total_profit_loss_sol, total_volume_sol, first_trade_at, last_trade_at
    )
    SELECT 
        NEW.persona_id,
        COUNT(*),
        COUNT(*) FILTER (WHERE is_profitable = true),
        COUNT(*) FILTER (WHERE is_profitable = false),
        SUM(profit_loss_sol),
        SUM(total_value_sol),
        MIN(executed_at),
        MAX(executed_at)
    FROM ai_trading_performance 
    WHERE persona_id = NEW.persona_id
    GROUP BY persona_id
    ON CONFLICT (persona_id) 
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        total_winning_trades = EXCLUDED.total_winning_trades,
        total_losing_trades = EXCLUDED.total_losing_trades,
        total_profit_loss_sol = EXCLUDED.total_profit_loss_sol,
        total_volume_sol = EXCLUDED.total_volume_sol,
        cumulative_return_percentage = CASE 
            WHEN EXCLUDED.total_volume_sol > 0 
            THEN (EXCLUDED.total_profit_loss_sol / EXCLUDED.total_volume_sol * 100)
            ELSE 0 
        END,
        last_trade_at = EXCLUDED.last_trade_at,
        active_days = EXTRACT(days FROM (EXCLUDED.last_trade_at - EXCLUDED.first_trade_at)) + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performance_summary
    AFTER INSERT ON ai_trading_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_summary();