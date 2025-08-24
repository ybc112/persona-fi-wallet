const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:persona123@localhost:5432/persona_fi',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initMarketplaceStatsData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始初始化市场统计数据...');
    
    // 1. 确保有用户数据
    console.log('📝 创建测试用户...');
    const users = [];
    for (let i = 1; i <= 50; i++) {
      const walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      const result = await client.query(`
        INSERT INTO users (wallet_address, email, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (wallet_address) DO NOTHING
        RETURNING id, wallet_address
      `, [walletAddress, `user${i}@example.com`, `User ${i}`]);
      
      if (result.rows.length > 0) {
        users.push(result.rows[0]);
      }
    }
    console.log(`✅ 创建了 ${users.length} 个用户`);

    // 2. 创建AI角色
    console.log('🤖 创建AI角色...');
    const personalityTypes = ['DeFi Expert', 'Meme Hunter', 'Conservative', 'GameFi Pro', 'NFT Specialist', 'Yield Farmer'];
    const riskLevels = ['Low', 'Medium', 'High'];
    const personas = [];

    for (let i = 1; i <= 100; i++) {
      const creatorId = users[Math.floor(Math.random() * users.length)].id;
      const personalityType = personalityTypes[Math.floor(Math.random() * personalityTypes.length)];
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      
      const result = await client.query(`
        INSERT INTO ai_personas (
          creator_id, name, personality_type, risk_level, 
          specialization, description, avatar_url, is_minted, is_listed, price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, name, personality_type
      `, [
        creatorId,
        `AI Persona ${i}`,
        personalityType,
        riskLevel,
        `Specialized in ${personalityType.toLowerCase()} strategies`,
        `An advanced AI personality focused on ${personalityType.toLowerCase()} trading with ${riskLevel.toLowerCase()} risk tolerance.`,
        `https://api.dicebear.com/7.x/bottts/svg?seed=persona${i}`,
        true, // is_minted
        Math.random() > 0.3, // 70% chance of being listed
        Math.random() * 10 + 0.5 // price between 0.5-10.5 SOL
      ]);
      
      personas.push(result.rows[0]);
    }
    console.log(`✅ 创建了 ${personas.length} 个AI角色`);

    // 3. 创建市场列表
    console.log('🏪 创建市场列表...');
    const listings = [];
    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];
      if (Math.random() > 0.3) { // 70% chance of being listed
        const sellerId = users[Math.floor(Math.random() * users.length)].id;
        const listingType = Math.random() > 0.7 ? 'rental' : 'sale';
        
        const result = await client.query(`
          INSERT INTO marketplace_listings (
            persona_id, seller_id, listing_type, price, 
            rental_price_per_day, min_rental_days, max_rental_days,
            nft_mint_address, status, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, persona_id, listing_type, price
        `, [
          persona.id,
          sellerId,
          listingType,
          listingType === 'sale' ? Math.random() * 10 + 0.5 : null,
          listingType === 'rental' ? Math.random() * 2 + 0.1 : null,
          listingType === 'rental' ? Math.floor(Math.random() * 5) + 1 : null,
          listingType === 'rental' ? Math.floor(Math.random() * 25) + 5 : null,
          `mint_${Math.random().toString(36).substr(2, 9)}`,
          'active',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        ]);
        
        listings.push(result.rows[0]);
      }
    }
    console.log(`✅ 创建了 ${listings.length} 个市场列表`);

    // 4. 创建交易记录
    console.log('💰 创建交易记录...');
    const transactions = [];
    for (let i = 0; i < 200; i++) {
      const listing = listings[Math.floor(Math.random() * listings.length)];
      const buyerId = users[Math.floor(Math.random() * users.length)].id;
      const sellerId = users[Math.floor(Math.random() * users.length)].id;
      
      // 确保买家和卖家不是同一人
      if (buyerId === sellerId) continue;
      
      const transactionType = listing.listing_type === 'rental' ? 'rental' : 'purchase';
      const price = listing.price || Math.random() * 5 + 0.5;
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // 过去30天内
      
      const result = await client.query(`
        INSERT INTO marketplace_transactions (
          listing_id, buyer_id, seller_id, persona_id, transaction_type,
          price, platform_fee, creator_royalty, transaction_signature,
          rental_start_date, rental_end_date, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, transaction_type, price
      `, [
        listing.id,
        buyerId,
        sellerId,
        listing.persona_id,
        transactionType,
        price,
        price * 0.025, // 2.5% platform fee
        price * 0.05,  // 5% creator royalty
        `tx_${Math.random().toString(36).substr(2, 9)}`,
        transactionType === 'rental' ? createdAt : null,
        transactionType === 'rental' ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        'completed',
        createdAt
      ]);
      
      transactions.push(result.rows[0]);
    }
    console.log(`✅ 创建了 ${transactions.length} 个交易记录`);

    // 5. 更新一些交易为最近24小时内
    console.log('⏰ 更新24小时内交易...');
    const recent24hCount = Math.floor(transactions.length * 0.1); // 10% of transactions in last 24h
    for (let i = 0; i < recent24hCount; i++) {
      const transaction = transactions[i];
      const recentTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // 过去24小时内
      
      await client.query(`
        UPDATE marketplace_transactions 
        SET created_at = $1 
        WHERE id = $2
      `, [recentTime, transaction.id]);
    }
    console.log(`✅ 更新了 ${recent24hCount} 个24小时内交易`);

    // 6. 验证数据
    console.log('🔍 验证统计数据...');
    
    const statsQueries = await Promise.all([
      client.query('SELECT COUNT(*) as total FROM ai_personas WHERE is_minted = true'),
      client.query('SELECT COUNT(*) as total FROM marketplace_listings WHERE status = \'active\''),
      client.query(`
        SELECT COUNT(DISTINCT buyer_id) as total
        FROM marketplace_transactions 
        WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'completed'
      `),
      client.query(`
        SELECT 
          COALESCE(SUM(price), 0) as volume_24h,
          COUNT(*) as transactions_24h
        FROM marketplace_transactions 
        WHERE created_at >= NOW() - INTERVAL '24 hours' AND status = 'completed'
      `),
      client.query(`
        SELECT COALESCE(AVG(price), 0) as avg_price
        FROM marketplace_listings 
        WHERE status = 'active' AND price IS NOT NULL
      `)
    ]);

    const stats = {
      totalPersonas: parseInt(statsQueries[0].rows[0].total),
      activeListings: parseInt(statsQueries[1].rows[0].total),
      activeTraders: parseInt(statsQueries[2].rows[0].total),
      volume24h: parseFloat(statsQueries[3].rows[0].volume_24h),
      transactions24h: parseInt(statsQueries[3].rows[0].transactions_24h),
      avgPrice: parseFloat(statsQueries[4].rows[0].avg_price)
    };

    console.log('📊 最终统计数据:');
    console.log(`   - 总AI角色数: ${stats.totalPersonas}`);
    console.log(`   - 活跃列表数: ${stats.activeListings}`);
    console.log(`   - 活跃交易者: ${stats.activeTraders}`);
    console.log(`   - 24小时交易量: ${stats.volume24h.toFixed(2)} SOL`);
    console.log(`   - 24小时交易数: ${stats.transactions24h}`);
    console.log(`   - 平均价格: ${stats.avgPrice.toFixed(2)} SOL`);

    console.log('✅ 市场统计数据初始化完成!');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 运行初始化
if (require.main === module) {
  initMarketplaceStatsData()
    .then(() => {
      console.log('🎉 数据初始化成功完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 数据初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { initMarketplaceStatsData };