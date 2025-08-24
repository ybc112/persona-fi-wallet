import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      listingId,
      transactionSignature,
      transactionType = 'purchase',
      rentalDays
    } = await request.json();

    console.log('💰 接收到购买请求:', {
      walletAddress,
      listingId,
      transactionType,
      rentalDays,
      transactionSignature: transactionSignature ? '已提供' : '未提供'
    });

    if (!walletAddress || !listingId || !transactionSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 1. 获取买家信息
    let buyer = await Database.getUserByWallet(walletAddress);
    if (!buyer) {
      // 如果买家不存在，创建新用户
      buyer = await Database.createUser(walletAddress);
    }

    // 2. 获取上架信息
    const listing = await Database.getMarketplaceListingById(listingId);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // 3. 验证上架状态
    if (listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Listing is not active' },
        { status: 400 }
      );
    }

    // 4. 验证买家不是卖家
    if (listing.seller_id === buyer.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot buy your own listing' },
        { status: 400 }
      );
    }

    // 5. 计算价格和费用
    let totalPrice: number;
    let rentalStartDate: Date | undefined;
    let rentalEndDate: Date | undefined;

    if (transactionType === 'rental') {
      if (!rentalDays || !listing.rental_price_per_day) {
        return NextResponse.json(
          { success: false, error: 'Rental days and daily price are required for rental' },
          { status: 400 }
        );
      }

      if (rentalDays < (listing.min_rental_days || 1) || 
          rentalDays > (listing.max_rental_days || 30)) {
        return NextResponse.json(
          { success: false, error: `Rental days must be between ${listing.min_rental_days || 1} and ${listing.max_rental_days || 30}` },
          { status: 400 }
        );
      }

      totalPrice = listing.rental_price_per_day * rentalDays;
      rentalStartDate = new Date();
      rentalEndDate = new Date();
      rentalEndDate.setDate(rentalEndDate.getDate() + rentalDays);
    } else {
      if (!listing.price) {
        return NextResponse.json(
          { success: false, error: 'This listing is not for sale' },
          { status: 400 }
        );
      }
      totalPrice = listing.price;
    }

    // 计算平台费用 (2.5%)
    const platformFee = totalPrice * 0.025;
    // 计算创作者版税 (5%)
    const creatorRoyalty = totalPrice * 0.05;

    // 6. 创建交易记录
    const transaction = await Database.createMarketplaceTransaction({
      listing_id: listingId,
      buyer_id: buyer.id,
      seller_id: listing.seller_id,
      persona_id: listing.persona_id,
      transaction_type: transactionType as 'purchase' | 'rental',
      price: totalPrice,
      platform_fee: platformFee,
      creator_royalty: creatorRoyalty,
      transaction_signature: transactionSignature,
      rental_start_date: rentalStartDate,
      rental_end_date: rentalEndDate,
      status: 'completed'
    });

    // 7. 更新上架状态
    if (transactionType === 'purchase') {
      // 购买后将上架状态设为已售出
      await Database.updateMarketplaceListingStatus(listingId, 'sold');
    }

    console.log('✅ 购买成功:', transaction.id);

    return NextResponse.json({
      success: true,
      message: transactionType === 'purchase' ? 'NFT purchased successfully!' : 'NFT rented successfully!',
      transaction: {
        id: transaction.id,
        transactionType: transaction.transaction_type,
        price: transaction.price,
        platformFee: transaction.platform_fee,
        creatorRoyalty: transaction.creator_royalty,
        rentalStartDate: transaction.rental_start_date,
        rentalEndDate: transaction.rental_end_date,
        status: transaction.status,
        createdAt: transaction.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ 购买失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete purchase' },
      { status: 500 }
    );
  }
}

// 获取用户的交易历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const type = searchParams.get('type') as 'buyer' | 'seller' | undefined;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // 获取用户信息
    const user = await Database.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 获取交易历史
    const transactions = await Database.getUserTransactions(user.id, type);

    // 格式化返回数据
    const formattedTransactions = transactions.map((tx: any) => ({
      id: tx.id,
      listingId: tx.listing_id,
      personaName: tx.persona_name,
      avatarUrl: tx.avatar_url,
      nftMintAddress: tx.nft_mint_address,
      transactionType: tx.transaction_type,
      price: tx.price,
      platformFee: tx.platform_fee,
      creatorRoyalty: tx.creator_royalty,
      transactionSignature: tx.transaction_signature,
      rentalStartDate: tx.rental_start_date,
      rentalEndDate: tx.rental_end_date,
      status: tx.status,
      buyerWallet: tx.buyer_wallet,
      sellerWallet: tx.seller_wallet,
      createdAt: tx.created_at
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions
    });

  } catch (error: any) {
    console.error('❌ 获取交易历史失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get transaction history' },
      { status: 500 }
    );
  }
}
