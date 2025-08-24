const fetch = require('node-fetch');

async function testMarketplaceStats() {
  try {
    console.log('🧪 测试市场统计API...');
    
    // 测试统计API
    const response = await fetch('http://localhost:3000/api/marketplace/stats');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 统计API测试成功!');
      console.log('📊 统计数据:');
      console.log(`   - 总AI角色数: ${result.stats.totalPersonas}`);
      console.log(`   - 活跃列表数: ${result.stats.activeListings}`);
      console.log(`   - 活跃交易者: ${result.stats.activeTraders}`);
      console.log(`   - 24小时交易量: ${result.stats.volume24h} SOL`);
      console.log(`   - 24小时交易数: ${result.stats.transactions24h}`);
      console.log(`   - 平均价格: ${result.stats.avgPrice} SOL`);
      
      if (result.stats.topPerformers && result.stats.topPerformers.length > 0) {
        console.log('🏆 表现最佳AI角色:');
        result.stats.topPerformers.slice(0, 3).forEach((performer, index) => {
          console.log(`   ${index + 1}. ${performer.name} (${performer.type}) - 交易量: ${performer.totalVolume} SOL`);
        });
      }
      
      if (result.stats.categoryStats && result.stats.categoryStats.length > 0) {
        console.log('📈 分类统计:');
        result.stats.categoryStats.forEach(category => {
          console.log(`   - ${category.type}: ${category.totalPersonas} 个角色, 平均价格: ${category.avgPrice.toFixed(2)} SOL`);
        });
      }
      
    } else {
      console.error('❌ 统计API测试失败:', result.error);
    }
    
  } catch (error) {
    console.error('💥 测试失败:', error.message);
  }
}

// 运行测试
testMarketplaceStats();