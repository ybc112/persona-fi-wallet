import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      personaId,
      listingType,
      price,
      rentalPricePerDay,
      minRentalDays,
      maxRentalDays,
      expiresAt
    } = await request.json();

    console.log('📋 接收到上架请求:', {
      walletAddress,
      personaId,
      listingType,
      price,
      rentalPricePerDay
    });

    if (!walletAddress || !personaId || !listingType) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 验证上架类型和价格
    if (listingType === 'sale' && !price) {
      return NextResponse.json(
        { success: false, error: 'Sale listings require a price' },
        { status: 400 }
      );
    }

    if (listingType === 'rental' && !rentalPricePerDay) {
      return NextResponse.json(
        { success: false, error: 'Rental listings require a daily price' },
        { status: 400 }
      );
    }

    // 1. 获取用户信息
    const user = await Database.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. 获取AI角色信息
    const persona = await Database.getAIPersonaById(personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: 'AI persona not found' },
        { status: 404 }
      );
    }

    // 3. 验证用户是否是该AI角色的创建者
    if (persona.creator_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only list your own AI personas' },
        { status: 403 }
      );
    }

    // 4. 验证AI角色是否已铸造NFT
    if (!persona.is_minted || !persona.nft_mint_address) {
      return NextResponse.json(
        { success: false, error: 'AI persona must be minted as NFT before listing' },
        { status: 400 }
      );
    }

    // 5. 检查是否已经上架
    const existingListings = await Database.getMarketplaceListingsBySeller(user.id);
    const activeListingForPersona = existingListings.find(
      listing => listing.persona_id === personaId && listing.status === 'active'
    );

    if (activeListingForPersona) {
      return NextResponse.json(
        { success: false, error: 'This AI persona is already listed' },
        { status: 400 }
      );
    }

    // 6. 创建市场列表
    const listing = await Database.createMarketplaceListing({
      persona_id: personaId,
      seller_id: user.id,
      listing_type: listingType,
      price: listingType === 'sale' ? price : undefined,
      rental_price_per_day: listingType === 'rental' ? rentalPricePerDay : undefined,
      min_rental_days: minRentalDays || 1,
      max_rental_days: maxRentalDays || 30,
      nft_mint_address: persona.nft_mint_address,
      metadata_uri: persona.avatar_url,
      expires_at: expiresAt ? new Date(expiresAt) : undefined
    });

    // 7. 更新AI角色的上架状态
    await Database.updateAIPersonaNFT(personaId, persona.nft_mint_address, true);

    console.log('✅ 上架成功:', listing.id);

    return NextResponse.json({
      success: true,
      message: 'NFT listed successfully!',
      listing: {
        id: listing.id,
        listingType: listing.listing_type,
        price: listing.price,
        rentalPricePerDay: listing.rental_price_per_day,
        status: listing.status,
        createdAt: listing.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ 上架失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list NFT' },
      { status: 500 }
    );
  }
}

// 获取用户的上架列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

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

    // 获取用户的上架列表
    const listings = await Database.getMarketplaceListingsBySeller(user.id);

    return NextResponse.json({
      success: true,
      listings
    });

  } catch (error: any) {
    console.error('❌ 获取上架列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get listings' },
      { status: 500 }
    );
  }
}

// 取消上架
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const walletAddress = searchParams.get('walletAddress');

    if (!listingId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
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

    // 获取上架信息
    const listing = await Database.getMarketplaceListingById(parseInt(listingId));
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // 验证用户权限
    if (listing.seller_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only cancel your own listings' },
        { status: 403 }
      );
    }

    // 取消上架
    await Database.updateMarketplaceListingStatus(parseInt(listingId), 'cancelled');

    return NextResponse.json({
      success: true,
      message: 'Listing cancelled successfully'
    });

  } catch (error: any) {
    console.error('❌ 取消上架失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel listing' },
      { status: 500 }
    );
  }
}
