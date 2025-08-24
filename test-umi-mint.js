/**
 * 测试Umi NFT铸造功能
 * 运行: node test-umi-mint.js
 */

const { Keypair } = require('@solana/web3.js');

async function testUmiMint() {
  try {
    console.log('🧪 开始测试Umi NFT铸造...');
    
    // 模拟测试数据
    const testData = {
      walletAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', // 测试钱包地址
      personaId: 1 // 假设存在的persona ID
    };
    
    console.log('📋 测试数据:', testData);
    
    // 调用API
    const response = await fetch('http://localhost:3000/api/nft/mint-umi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    console.log('📊 API响应:', result);
    
    if (result.success) {
      console.log('✅ 测试成功!');
      console.log('🎯 NFT地址:', result.mintAddress);
      console.log('📝 交易签名:', result.transactionSignature);
      console.log('🔗 浏览器链接:', result.explorerUrl);
    } else {
      console.log('❌ 测试失败:', result.error);
    }
    
  } catch (error) {
    console.error('💥 测试出错:', error.message);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testUmiMint();
}

module.exports = { testUmiMint };
