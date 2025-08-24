import Database from '@/lib/database';

// 初始化性能数据的脚本
async function initPerformanceData() {
  try {
    console.log('🚀 开始初始化AI性能数据...');

    // 1. 创建性能相关表（如果不存在）
    console.log('📊 创建性能表...');
    
    const createTablesQuery = `
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
    `;

    await Database.query(createTablesQuery);
    console.log('✅ 性能表创建成功');

    // 2. 获取现有的AI角色
    const personas = await Database.query('SELECT id, name, personality_type FROM ai_personas WHERE is_minted = true');
    console.log(`📋 找到 ${personas.rows.length} 个已铸造的AI角色`);

    if (personas.rows.length === 0) {
      console.log('⚠️ 没有找到已铸造的AI角色，创建示例数据...');
      
      // 创建示例用户和AI角色
      const user = await Database.createUser('0x1234567890123456789012345678901234567890', 'demo@example.com', 'Demo User');
      
      const persona1 = await Database.createAIPersona({
        creator_id: user.id,
        name: 'DeFi Dragon',
        personality_type: 'defi-expert',
        risk_level: 'medium',
        description: 'Expert in DeFi protocols and yield farming strategies'
      });
      
      const persona2 = await Database.createAIPersona({
        creator_id: user.id,
        name: 'Yield Yeti',
        personality_type: 'conservative',
        risk_level: 'low',
        description: 'Conservative investor focused on stable yields'
      });

      // 标记为已铸造
      await Database.updateAIPersonaNFT(persona1.id, 'mint_address_1', true);
      await Database.updateAIPersonaNFT(persona2.id, 'mint_address_2', true);

      personas.rows = [persona1, persona2];
    }

    // 3. 为每个AI角色生成示例交易数据
    console.log('💰 生成示例交易数据...');
    
    for (const persona of personas.rows) {
      console.log(`  处理 ${persona.name} (ID: ${persona.id})`);
      
      // 生成过去30天的交易数据
      const trades = generateSampleTrades(persona.id, persona.personality_type);
      
      for (const trade of trades) {
        try {
          await Database.recordAITrade(trade);
        } catch (error: any) {
          if (!error.message.includes('duplicate key')) {
            console.error(`    交易记录失败:`, error.message);
          }
        }
      }
      
      console.log(`  ✅ ${persona.name} 生成了 ${trades.length} 条交易记录`);
    }

    // 4. 更新排名
    console.log('🏆 更新排名...');
    await Database.updatePerformanceRanks();

    console.log('🎉 AI性能数据初始化完成！');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 生成示例交易数据
function generateSampleTrades(personaId: number, personalityType: string) {
  const trades = [];
  const tokens = [
    { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'BONK', mint: '5P3giWpPBrVKL8QP8roKM7NsLdi3ie1Nc2b5r9mGtvwb' },
    { symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' }
  ];

  // 根据个性类型调整交易特征
  let tradeCount, winRate, avgVolume;
  switch (personalityType) {
    case 'defi-expert':
      tradeCount = 15 + Math.floor(Math.random() * 10);
      winRate = 0.75 + Math.random() * 0.15;
      avgVolume = 50 + Math.random() * 100;
      break;
    case 'conservative':
      tradeCount = 8 + Math.floor(Math.random() * 7);
      winRate = 0.80 + Math.random() * 0.10;
      avgVolume = 20 + Math.random() * 50;
      break;
    case 'aggressive-trader':
      tradeCount = 20 + Math.floor(Math.random() * 15);
      winRate = 0.60 + Math.random() * 0.20;
      avgVolume = 30 + Math.random() * 80;
      break;
    case 'meme-hunter':
      tradeCount = 25 + Math.floor(Math.random() * 20);
      winRate = 0.55 + Math.random() * 0.25;
      avgVolume = 15 + Math.random() * 60;
      break;
    default:
      tradeCount = 10 + Math.floor(Math.random() * 10);
      winRate = 0.65 + Math.random() * 0.20;
      avgVolume = 25 + Math.random() * 50;
  }

  // 生成交易对（买入和卖出）
  for (let i = 0; i < Math.floor(tradeCount / 2); i++) {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 30));
    
    const amount = (Math.random() * avgVolume * 2).toFixed(8);
    const buyPrice = (Math.random() * 200 + 50).toFixed(8);
    const buyValue = (parseFloat(amount) * parseFloat(buyPrice)).toFixed(8);
    
    // 买入交易
    const buyTrade = {
      persona_id: personaId,
      token_symbol: token.symbol,
      token_mint_address: token.mint,
      trade_type: 'buy' as const,
      amount: parseFloat(amount),
      price_sol: parseFloat(buyPrice),
      total_value_sol: parseFloat(buyValue),
      transaction_signature: `tx_${personaId}_${i}_buy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      market_cap_at_trade: Math.random() * 100000000,
      volume_24h_at_trade: Math.random() * 10000000
    };

    // 卖出交易（1-3天后）
    const sellDate = new Date(baseDate);
    sellDate.setDate(sellDate.getDate() + 1 + Math.floor(Math.random() * 3));
    
    const isWinning = Math.random() < winRate;
    const priceChange = isWinning ? 
      (1 + Math.random() * 0.5) : // 盈利：0-50%涨幅
      (0.7 + Math.random() * 0.25); // 亏损：25-30%跌幅
    
    const sellPrice = (parseFloat(buyPrice) * priceChange).toFixed(8);
    const sellValue = (parseFloat(amount) * parseFloat(sellPrice)).toFixed(8);
    const profitLoss = (parseFloat(sellValue) - parseFloat(buyValue)).toFixed(8);
    const profitLossPercentage = ((parseFloat(profitLoss) / parseFloat(buyValue)) * 100).toFixed(4);

    const sellTrade = {
      persona_id: personaId,
      token_symbol: token.symbol,
      token_mint_address: token.mint,
      trade_type: 'sell' as const,
      amount: parseFloat(amount),
      price_sol: parseFloat(sellPrice),
      total_value_sol: parseFloat(sellValue),
      is_profitable: isWinning,
      profit_loss_sol: parseFloat(profitLoss),
      profit_loss_percentage: parseFloat(profitLossPercentage),
      transaction_signature: `tx_${personaId}_${i}_sell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      market_cap_at_trade: Math.random() * 100000000,
      volume_24h_at_trade: Math.random() * 10000000
    };

    trades.push(buyTrade, sellTrade);
  }

  return trades;
}

// 如果直接运行此脚本
if (require.main === module) {
  initPerformanceData()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export default initPerformanceData;