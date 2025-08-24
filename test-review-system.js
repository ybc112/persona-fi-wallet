const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  connectionString: 'postgresql://postgres:persona123@localhost:5433/persona_fi'
});

async function testReviewSystem() {
  try {
    console.log('🧪 测试评价系统...');
    
    // 1. 测试获取评价统计
    console.log('\n📊 测试评价统计查询...');
    const statsQuery = `
      SELECT 
        ap.id,
        ap.name,
        COUNT(r.id) as review_count,
        AVG(r.rating)::DECIMAL(3,2) as avg_rating,
        COUNT(r.id) FILTER (WHERE r.is_verified_purchase = true) as verified_count
      FROM ai_personas ap
      LEFT JOIN ai_persona_reviews r ON ap.id = r.persona_id
      WHERE ap.is_minted = true
      GROUP BY ap.id, ap.name
      HAVING COUNT(r.id) > 0
      ORDER BY avg_rating DESC
    `;
    
    const statsResult = await pool.query(statsQuery);
    
    console.log('AI角色评价统计:');
    console.log('ID | 名称 | 评价数 | 平均分 | 已购买评价');
    console.log('---|------|--------|--------|----------');
    
    statsResult.rows.forEach(row => {
      console.log(`${row.id.toString().padStart(2)} | ${row.name.padEnd(12)} | ${row.review_count.toString().padStart(6)} | ${row.avg_rating.toString().padStart(6)} | ${row.verified_count.toString().padStart(10)}`);
    });
    
    // 2. 测试获取详细评价
    if (statsResult.rows.length > 0) {
      const firstPersona = statsResult.rows[0];
      console.log(`\n💬 测试获取AI角色 "${firstPersona.name}" 的详细评价...`);
      
      const reviewsQuery = `
        SELECT 
          r.*,
          u.wallet_address as reviewer_wallet,
          u.name as reviewer_name
        FROM ai_persona_reviews r
        JOIN users u ON r.reviewer_id = u.id
        WHERE r.persona_id = $1
        ORDER BY r.created_at DESC
      `;
      
      const reviewsResult = await pool.query(reviewsQuery, [firstPersona.id]);
      
      console.log(`找到 ${reviewsResult.rows.length} 条评价:`);
      
      reviewsResult.rows.forEach((review, index) => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const wallet = review.reviewer_wallet.slice(0, 8) + '...';
        const verified = review.is_verified_purchase ? '✓已购买' : '未购买';
        const helpful = review.helpful_count > 0 ? `👍${review.helpful_count}` : '';
        
        console.log(`\n${index + 1}. ${stars} (${review.rating}/5) - ${wallet} ${verified} ${helpful}`);
        if (review.comment) {
          console.log(`   "${review.comment}"`);
        }
        console.log(`   ${new Date(review.created_at).toLocaleDateString()}`);
      });
    }
    
    // 3. 测试评分分布
    console.log('\n📈 测试评分分布查询...');
    const distributionQuery = `
      SELECT 
        rating,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM ai_persona_reviews
      GROUP BY rating
      ORDER BY rating DESC
    `;
    
    const distributionResult = await pool.query(distributionQuery);
    
    console.log('评分分布:');
    distributionResult.rows.forEach(row => {
      const stars = '★'.repeat(row.rating);
      const bar = '█'.repeat(Math.round(row.percentage / 5));
      console.log(`${stars} ${row.rating}星: ${row.count}条 (${row.percentage}%) ${bar}`);
    });
    
    // 4. 测试有用性投票统计
    console.log('\n👍 测试有用性投票统计...');
    const voteStatsQuery = `
      SELECT 
        COUNT(*) as total_votes,
        COUNT(*) FILTER (WHERE is_helpful = true) as helpful_votes,
        COUNT(*) FILTER (WHERE is_helpful = false) as unhelpful_votes,
        ROUND(COUNT(*) FILTER (WHERE is_helpful = true) * 100.0 / COUNT(*), 1) as helpful_percentage
      FROM review_helpfulness
    `;
    
    const voteStatsResult = await pool.query(voteStatsQuery);
    const voteStats = voteStatsResult.rows[0];
    
    console.log(`总投票数: ${voteStats.total_votes}`);
    console.log(`有用投票: ${voteStats.helpful_votes} (${voteStats.helpful_percentage}%)`);
    console.log(`无用投票: ${voteStats.unhelpful_votes}`);
    
    console.log('\n✅ 评价系统测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
testReviewSystem().catch(console.error);