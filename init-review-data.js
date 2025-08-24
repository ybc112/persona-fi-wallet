const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: 'postgresql://postgres:persona123@localhost:5433/persona_fi'
});

async function initReviewSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始初始化评价系统...');
    
    await client.query('BEGIN');
    
    // 1. 创建评价表
    console.log('📝 创建AI角色评价表...');
    await client.query(`
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
    `);
    
    // 2. 创建评价有用性投票表
    console.log('👍 创建评价有用性投票表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS review_helpfulness (
        id SERIAL PRIMARY KEY,
        review_id INTEGER REFERENCES ai_persona_reviews(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_helpful BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(review_id, user_id)
      );
    `);
    
    // 3. 创建索引
    console.log('🔍 创建索引...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_persona ON ai_persona_reviews(persona_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON ai_persona_reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_reviews_verified ON ai_persona_reviews(is_verified_purchase);
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON ai_persona_reviews(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_helpfulness_review ON review_helpfulness(review_id);
    `);
    
    // 4. 创建更新时间触发器
    console.log('⏰ 创建更新时间触发器...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_ai_persona_reviews_updated_at ON ai_persona_reviews;
      CREATE TRIGGER update_ai_persona_reviews_updated_at 
          BEFORE UPDATE ON ai_persona_reviews 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // 5. 获取现有的AI角色和用户数据
    console.log('📊 获取现有数据...');
    const personasResult = await client.query(`
      SELECT ap.id, ap.name, ap.creator_id 
      FROM ai_personas ap 
      WHERE ap.is_minted = true 
      ORDER BY ap.id 
      LIMIT 10
    `);
    
    const usersResult = await client.query(`
      SELECT id, wallet_address 
      FROM users 
      ORDER BY id 
      LIMIT 20
    `);
    
    console.log(`找到 ${personasResult.rows.length} 个AI角色和 ${usersResult.rows.length} 个用户`);
    
    // 6. 生成测试评价数据
    if (personasResult.rows.length > 0 && usersResult.rows.length > 0) {
      console.log('💬 生成测试评价数据...');
      
      const sampleComments = [
        '这个AI角色的交易策略非常出色，帮我获得了不错的收益！推荐给所有DeFi爱好者。',
        '表现稳定，风险控制做得很好，就是有时候反应稍微慢一点。',
        '还可以，但是感觉策略比较保守，收益率一般。',
        '非常满意！这个AI在市场波动中表现出色，值得信赖。',
        '用了一段时间，整体不错，但希望能有更多的自定义选项。',
        '交易逻辑清晰，执行效率高，是个不错的AI助手。',
        '刚开始使用，感觉还行，期待后续的表现。',
        '功能强大，界面友好，推荐新手使用。',
        '专业性很强，适合有经验的交易者。',
        '性价比很高，值得购买和使用。',
        '创新的交易策略，让我学到了很多。',
        '客服响应及时，使用体验良好。'
      ];
      
      let reviewCount = 0;
      
      for (const persona of personasResult.rows) {
        // 为每个AI角色生成2-5个评价
        const numReviews = Math.floor(Math.random() * 4) + 2;
        const shuffledUsers = [...usersResult.rows].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(numReviews, shuffledUsers.length); i++) {
          const user = shuffledUsers[i];
          
          // 跳过创建者自己的评价
          if (user.id === persona.creator_id) continue;
          
          const rating = Math.floor(Math.random() * 5) + 1; // 1-5星
          const comment = Math.random() > 0.3 ? sampleComments[Math.floor(Math.random() * sampleComments.length)] : null;
          const isVerifiedPurchase = Math.random() > 0.4; // 60%概率为已购买用户
          const helpfulCount = Math.floor(Math.random() * 8); // 0-7个有用投票
          
          // 随机生成创建时间（最近30天内）
          const daysAgo = Math.floor(Math.random() * 30);
          const createdAt = new Date();
          createdAt.setDate(createdAt.getDate() - daysAgo);
          
          try {
            await client.query(`
              INSERT INTO ai_persona_reviews (
                persona_id, reviewer_id, rating, comment, 
                is_verified_purchase, helpful_count, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (persona_id, reviewer_id) DO NOTHING
            `, [
              persona.id,
              user.id,
              rating,
              comment,
              isVerifiedPurchase,
              helpfulCount,
              createdAt
            ]);
            
            reviewCount++;
          } catch (error) {
            // 忽略重复键错误
            if (error.code !== '23505') {
              console.error('插入评价失败:', error);
            }
          }
        }
      }
      
      console.log(`✅ 成功生成 ${reviewCount} 条评价记录`);
      
      // 7. 生成一些有用性投票数据
      console.log('👍 生成有用性投票数据...');
      
      const reviewsResult = await client.query(`
        SELECT id FROM ai_persona_reviews ORDER BY id
      `);
      
      let voteCount = 0;
      
      for (const review of reviewsResult.rows) {
        // 为每个评价生成0-5个投票
        const numVotes = Math.floor(Math.random() * 6);
        const shuffledVoters = [...usersResult.rows].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(numVotes, shuffledVoters.length); i++) {
          const voter = shuffledVoters[i];
          const isHelpful = Math.random() > 0.2; // 80%概率投有用
          
          try {
            await client.query(`
              INSERT INTO review_helpfulness (review_id, user_id, is_helpful)
              VALUES ($1, $2, $3)
              ON CONFLICT (review_id, user_id) DO NOTHING
            `, [review.id, voter.id, isHelpful]);
            
            voteCount++;
          } catch (error) {
            if (error.code !== '23505') {
              console.error('插入投票失败:', error);
            }
          }
        }
      }
      
      // 8. 更新评价的有用计数
      console.log('🔄 更新有用计数...');
      await client.query(`
        UPDATE ai_persona_reviews 
        SET helpful_count = (
          SELECT COUNT(*) 
          FROM review_helpfulness 
          WHERE review_id = ai_persona_reviews.id AND is_helpful = true
        )
      `);
      
      console.log(`✅ 成功生成 ${voteCount} 条投票记录`);
    }
    
    await client.query('COMMIT');
    
    // 9. 显示统计信息
    console.log('\n📈 评价系统统计信息:');
    
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating)::DECIMAL(3,2) as avg_rating,
        COUNT(*) FILTER (WHERE is_verified_purchase = true) as verified_reviews,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star
      FROM ai_persona_reviews
    `);
    
    const stats = statsResult.rows[0];
    console.log(`总评价数: ${stats.total_reviews}`);
    console.log(`平均评分: ${stats.avg_rating}`);
    console.log(`已购买用户评价: ${stats.verified_reviews}`);
    console.log(`评分分布: 5星(${stats.five_star}) 4星(${stats.four_star}) 3星(${stats.three_star}) 2星(${stats.two_star}) 1星(${stats.one_star})`);
    
    const voteStatsResult = await client.query(`
      SELECT COUNT(*) as total_votes
      FROM review_helpfulness
    `);
    
    console.log(`总投票数: ${voteStatsResult.rows[0].total_votes}`);
    
    console.log('\n🎉 评价系统初始化完成！');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行初始化
initReviewSystem().catch(console.error);