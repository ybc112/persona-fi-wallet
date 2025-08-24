import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nftId,
      listingId,
      purchaseType,
      rentalDays,
      buyerWallet,
      totalPrice
    } = body;

    console.log('🛒 接收到购买请求:', {
      nftId,
      listingId,
      purchaseType,
      rentalDays,
      buyerWallet,
      totalPrice
    });

    // 验证必需参数
    if (!nftId || !listingId || !purchaseType || !buyerWallet || !totalPrice) {
      return NextResponse.json({
        success: false,
        error: '缺少必需参数'
      }, { status: 400 });
    }

    // 获取NFT信息
    const nft = await Database.getAIPersonaById(nftId);
    if (!nft) {
      return NextResponse.json({
        success: false,
        error: 'NFT不存在'
      }, { status: 404 });
    }

    // 获取listing信息
    const listing = await Database.getMarketplaceListingById(listingId);
    if (!listing) {
      return NextResponse.json({
        success: false,
        error: 'Listing不存在'
      }, { status: 404 });
    }

    // 检查listing状态
    if (listing.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'NFT已下架或不可购买'
      }, { status: 400 });
    }

    // 获取卖家信息
    const seller = await Database.getUserById(listing.seller_id);
    if (!seller) {
      return NextResponse.json({
        success: false,
        error: '卖家信息不存在'
      }, { status: 404 });
    }

    // 检查买家不能是卖家
    if (buyerWallet === seller.wallet_address) {
      return NextResponse.json({
        success: false,
        error: '不能购买自己的NFT'
      }, { status: 400 });
    }

    // 验证价格
    let expectedPrice = 0;
    if (purchaseType === 'buy') {
      expectedPrice = listing.price || 0;
    } else if (purchaseType === 'rent') {
      if (!rentalDays || rentalDays < (listing.min_rental_days || 1) || rentalDays > (listing.max_rental_days || 30)) {
        return NextResponse.json({
          success: false,
          error: '租赁天数不符合要求'
        }, { status: 400 });
      }
      expectedPrice = (listing.rental_price_per_day || 0) * rentalDays;
    }

    if (Math.abs(totalPrice - expectedPrice) > 0.0001) {
      return NextResponse.json({
        success: false,
        error: '价格不匹配'
      }, { status: 400 });
    }

    // 模拟区块链交易
    const transactionSignature = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 计算费用分配
    const platformFee = totalPrice * 0.025; // 2.5% platform fee
    const creatorRoyalty = purchaseType === 'buy' ? totalPrice * 0.05 : 0; // 5% creator royalty for sales only
    const sellerAmount = totalPrice - platformFee - creatorRoyalty;

    // 获取或创建买家用户记录
    let buyer = await Database.getUserByWallet(buyerWallet);
    if (!buyer) {
      buyer = await Database.createUser({
        wallet_address: buyerWallet,
        username: `user_${buyerWallet.slice(0, 8)}`,
        email: null
      });
    }

    // 创建购买记录 - 这里需要在数据库中添加purchases表
    // 暂时先记录交易信息，后续可以扩展

    // 更新listing状态
    if (purchaseType === 'buy') {
      // 完全购买 - 标记为已售出
      await Database.updateMarketplaceListingStatus(listingId, 'sold');

      // 这里应该更新NFT的所有权，但当前数据库结构中没有owner字段
      // 可以考虑在ai_personas表中添加current_owner_id字段
    } else {
      // 租赁 - 可以保持active状态，或者添加租赁记录
      // 这里需要扩展数据库结构来支持租赁功能
    }

    // 模拟一些延迟（真实区块链交易需要时间）
    await new Promise(resolve => setTimeout(resolve, 1000));

    const expiryDate = purchaseType === 'rent' && rentalDays
      ? new Date(Date.now() + rentalDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    console.log('✅ 购买成功:', { transactionSignature, purchaseType });

    return NextResponse.json({
      success: true,
      purchase: {
        id: Date.now(),
        transactionSignature,
        purchaseType,
        totalPrice,
        rentalDays: purchaseType === 'rent' ? rentalDays : undefined,
        expiryDate,
        nftName: nft.name,
        avatarUrl: nft.avatar_url
      },
      message: purchaseType === 'buy' ? '购买成功！' : '租赁成功！'
    });

  } catch (error) {
    console.error('Purchase API Error:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

// 获取用户的购买历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json({
        success: false,
        error: '缺少用户钱包地址'
      }, { status: 400 });
    }

    // 暂时返回空数组，因为还没有实现购买历史表
    // 后续可以扩展数据库结构来支持购买历史记录
    return NextResponse.json({
      success: true,
      purchases: []
    });

  } catch (error) {
    console.error('Get Purchases API Error:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}
