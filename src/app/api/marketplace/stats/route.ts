import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 获取市场统计数据...');

    // 基础统计数据查询
    const [
      totalPersonasResult,
      activeListingsResult,
      totalTradersResult,
      volumeStatsResult,
      avgPriceResult
    ] = await Promise.all([
      // 1. 总AI角色数量
      Database.query(`
        SELECT COUNT(*) as total 
        FROM ai_personas 
        WHERE is_minted = true
      `).catch(() => ({ rows: [{ total: '0' }] })),
      
      // 2. 活跃上架数量
      Database.query(`
        SELECT COUNT(*) as total 
        FROM marketplace_listings 
        WHERE status = 'active'
      `).catch(() => ({ rows: [{ total: '0' }] })),
      
      // 3. 活跃交易者数量（最近30天有交易的用户）
      Database.query(`
        SELECT COUNT(DISTINCT buyer_id) as total
        FROM marketplace_transactions 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status = 'completed'
      `).catch(() => ({ rows: [{ total: '0' }] })),
      
      // 4. 24小时交易量统计
      Database.query(`
        SELECT 
          COALESCE(SUM(price), 0) as volume_24h,
          COUNT(*) as transactions_24h
        FROM marketplace_transactions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status = 'completed'
      `).catch(() => ({ rows: [{ volume_24h: '0', transactions_24h: '0' }] })),
      
      // 5. 平均价格（活跃上架的平均价格）
      Database.query(`
        SELECT 
          COALESCE(AVG(price), 0) as avg_price,
          COALESCE(AVG(rental_price_per_day), 0) as avg_rental_price
        FROM marketplace_listings 
        WHERE status = 'active' 
        AND price IS NOT NULL
      `).catch(() => ({ rows: [{ avg_price: '0', avg_rental_price: '0' }] }))
    ]);

    // 尝试获取更多详细统计（如果表存在）
    let topPerformers = [];
    let recentTransactions = [];
    let categoryStats = [];

    try {
      // 6. 表现最佳的AI角色（基于交易量）
      const topPerformersResult = await Database.query(`
        SELECT 
          ap.name as persona_name,
          ap.personality_type,
          COUNT(DISTINCT mt.id) as transaction_count,
          COALESCE(SUM(mt.price), 0) as total_volume
        FROM ai_personas ap
        LEFT JOIN marketplace_transactions mt ON ap.id = mt.persona_id AND mt.status = 'completed'
        WHERE ap.is_minted = true
        GROUP BY ap.id, ap.name, ap.personality_type
        HAVING COUNT(DISTINCT mt.id) > 0
        ORDER BY total_volume DESC
        LIMIT 5
      `);
      
      topPerformers = topPerformersResult.rows.map(row => ({
        name: row.persona_name,
        type: row.personality_type,
        avgRating: 0, // 暂时设为0，等评价系统表创建后再更新
        transactionCount: parseInt(row.transaction_count || '0'),
        totalVolume: parseFloat(row.total_volume || '0')
      }));
    } catch (error) {
      console.log('跳过表现最佳AI角色查询:', error.message);
    }

    try {
      // 7. 最近交易记录
      const recentTransactionsResult = await Database.query(`
        SELECT 
          mt.transaction_type,
          mt.price,
          mt.created_at,
          ap.name as persona_name,
          ap.personality_type
        FROM marketplace_transactions mt
        JOIN ai_personas ap ON mt.persona_id = ap.id
        WHERE mt.status = 'completed'
        ORDER BY mt.created_at DESC
        LIMIT 10
      `);
      
      recentTransactions = recentTransactionsResult.rows.map(row => ({
        type: row.transaction_type,
        price: parseFloat(row.price || '0'),
        createdAt: row.created_at,
        personaName: row.persona_name,
        personalityType: row.personality_type
      }));
    } catch (error) {
      console.log('跳过最近交易记录查询:', error.message);
    }

    try {
      // 8. 按类型分类统计
      const categoryStatsResult = await Database.query(`
        SELECT 
          ap.personality_type,
          COUNT(*) as total_personas,
          COUNT(CASE WHEN ml.status = 'active' THEN 1 END) as active_listings,
          COALESCE(AVG(ml.price), 0) as avg_price,
          COALESCE(SUM(mt.price), 0) as total_volume
        FROM ai_personas ap
        LEFT JOIN marketplace_listings ml ON ap.id = ml.persona_id
        LEFT JOIN marketplace_transactions mt ON ap.id = mt.persona_id AND mt.status = 'completed'
        WHERE ap.is_minted = true
        GROUP BY ap.personality_type
        ORDER BY total_volume DESC
      `);
      
      categoryStats = categoryStatsResult.rows.map(row => ({
        type: row.personality_type,
        totalPersonas: parseInt(row.total_personas || '0'),
        activeListings: parseInt(row.active_listings || '0'),
        avgPrice: parseFloat(row.avg_price || '0'),
        totalVolume: parseFloat(row.total_volume || '0')
      }));
    } catch (error) {
      console.log('跳过分类统计查询:', error.message);
    }

    // 格式化统计数据
    const stats = {
      // 基础统计
      totalPersonas: parseInt(totalPersonasResult.rows[0]?.total || '0'),
      activeListings: parseInt(activeListingsResult.rows[0]?.total || '0'),
      activeTraders: parseInt(totalTradersResult.rows[0]?.total || '0'),
      
      // 交易统计
      volume24h: parseFloat(volumeStatsResult.rows[0]?.volume_24h || '0'),
      transactions24h: parseInt(volumeStatsResult.rows[0]?.transactions_24h || '0'),
      avgPrice: parseFloat(avgPriceResult.rows[0]?.avg_price || '0'),
      avgRentalPrice: parseFloat(avgPriceResult.rows[0]?.avg_rental_price || '0'),
      
      // 详细统计
      topPerformers,
      recentTransactions,
      categoryStats
    };

    console.log('✅ 市场统计数据获取成功:', {
      totalPersonas: stats.totalPersonas,
      activeListings: stats.activeListings,
      activeTraders: stats.activeTraders,
      volume24h: stats.volume24h,
      avgPrice: stats.avgPrice
    });

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 获取市场统计失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get marketplace stats',
        // 返回默认统计数据作为后备
        stats: {
          totalPersonas: 0,
          activeListings: 0,
          activeTraders: 0,
          volume24h: 0,
          transactions24h: 0,
          avgPrice: 0,
          avgRentalPrice: 0,
          topPerformers: [],
          recentTransactions: [],
          categoryStats: []
        }
      },
      { status: 500 }
    );
  }
}