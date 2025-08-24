import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 初始化购买测试数据...');

    // 1. 创建测试用户（卖家）
    const sellerWallet = 'seller_test_wallet_123';
    let seller = await Database.getUserByWallet(sellerWallet);
    if (!seller) {
      seller = await Database.createUser({
        wallet_address: sellerWallet,
        username: 'test_seller',
        email: 'seller@test.com'
      });
    }

    // 2. 创建测试AI角色
    const testPersona = {
      name: 'DeFi投资大师',
      personality_type: 'DeFi Expert',
      risk_level: 'Medium',
      specialization: 'DeFi协议分析与投资策略',
      description: '专注于DeFi生态系统分析，具有丰富的流动性挖矿和收益农场经验。能够识别高潜力DeFi项目并制定风险可控的投资策略。',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=defi-master',
      creator_id: seller.id,
      is_minted: true,
      nft_mint_address: 'test_mint_address_defi_master_123'
    };

    let persona = await Database.getAIPersonaByName(testPersona.name);
    if (!persona) {
      persona = await Database.createAIPersona(testPersona);
    }

    // 3. 创建测试上架信息
    const testListing = {
      persona_id: persona.id,
      seller_id: seller.id,
      listing_type: 'sale' as const,
      price: 1.5,
      rental_price_per_day: 0.1,
      min_rental_days: 1,
      max_rental_days: 30,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30天后过期
    };

    // 检查是否已有活跃的listing
    const existingListings = await Database.getMarketplaceListingsByPersona(persona.id);
    const activeListing = existingListings.find(l => l.status === 'active');

    let listing;
    if (!activeListing) {
      listing = await Database.createMarketplaceListing(testListing);
    } else {
      listing = activeListing;
    }

    // 4. 创建另一个测试AI角色（Meme猎手）
    const testPersona2 = {
      name: 'Meme币猎手',
      personality_type: 'Meme Hunter',
      risk_level: 'High',
      specialization: '早期Meme币发现与快速交易',
      description: '专门发现和分析新兴Meme币项目，具有敏锐的市场嗅觉和快速决策能力。擅长识别社区驱动的项目潜力。',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=meme-hunter',
      creator_id: seller.id,
      is_minted: true,
      nft_mint_address: 'test_mint_address_meme_hunter_456'
    };

    let persona2 = await Database.getAIPersonaByName(testPersona2.name);
    if (!persona2) {
      persona2 = await Database.createAIPersona(testPersona2);
    }

    const testListing2 = {
      persona_id: persona2.id,
      seller_id: seller.id,
      listing_type: 'sale' as const,
      price: 2.0,
      rental_price_per_day: 0.15,
      min_rental_days: 1,
      max_rental_days: 14,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const existingListings2 = await Database.getMarketplaceListingsByPersona(persona2.id);
    const activeListing2 = existingListings2.find(l => l.status === 'active');

    let listing2;
    if (!activeListing2) {
      listing2 = await Database.createMarketplaceListing(testListing2);
    } else {
      listing2 = activeListing2;
    }

    console.log('✅ 购买测试数据初始化完成');

    return NextResponse.json({
      success: true,
      message: '测试数据初始化成功',
      data: {
        seller: {
          id: seller.id,
          wallet: seller.wallet_address
        },
        personas: [
          {
            id: persona.id,
            name: persona.name,
            listingId: listing?.id || activeListing?.id
          },
          {
            id: persona2.id,
            name: persona2.name,
            listingId: listing2?.id || activeListing2?.id
          }
        ]
      }
    });

  } catch (error: any) {
    console.error('❌ 初始化测试数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '初始化测试数据失败'
    }, { status: 500 });
  }
}
