import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

// 获取特定NFT的listing信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = parseInt(id);

    if (isNaN(personaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    console.log('🔍 获取NFT listing信息:', { personaId });

    // 获取该NFT的活跃listing
    const listings = await Database.getMarketplaceListingsByPersona(personaId);
    
    // 只返回活跃的listing
    const activeListing = listings.find(listing => listing.status === 'active');

    if (!activeListing) {
      return NextResponse.json({
        success: true,
        listing: null,
        message: 'No active listing found'
      });
    }

    // 格式化listing数据
    const formattedListing = {
      id: activeListing.id,
      listingType: activeListing.listing_type,
      price: activeListing.price,
      rentalPricePerDay: activeListing.rental_price_per_day,
      minRentalDays: activeListing.min_rental_days,
      maxRentalDays: activeListing.max_rental_days,
      status: activeListing.status,
      createdAt: activeListing.created_at,
      expiresAt: activeListing.expires_at
    };

    console.log('✅ NFT listing信息获取成功');

    return NextResponse.json({
      success: true,
      listing: formattedListing
    });

  } catch (error: any) {
    console.error('❌ 获取NFT listing失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get NFT listing' },
      { status: 500 }
    );
  }
}
