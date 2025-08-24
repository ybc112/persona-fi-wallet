import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const status = searchParams.get('status') || 'active';
    const listingType = searchParams.get('listingType');
    const personalityType = searchParams.get('personalityType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 浏览市场请求:', {
      status,
      listingType,
      personalityType,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    // 构建过滤条件
    const filters: any = {};
    if (status) filters.status = status;
    if (listingType) filters.listing_type = listingType;
    if (personalityType) filters.personality_type = personalityType;
    if (minPrice) filters.min_price = parseFloat(minPrice);
    if (maxPrice) filters.max_price = parseFloat(maxPrice);

    // 构建选项
    const options = {
      limit,
      offset,
      sort_by: sortBy,
      sort_order: sortOrder
    };

    // 获取市场列表
    const listings = await Database.getMarketplaceListings(filters, options);

    // 格式化返回数据
    const formattedListings = listings.map((listing: any) => ({
      id: listing.id,
      personaId: listing.persona_id,
      personaName: listing.persona_name,
      personalityType: listing.personality_type,
      riskLevel: listing.risk_level,
      avatarUrl: listing.avatar_url,
      description: listing.description,
      listingType: listing.listing_type,
      price: listing.price,
      rentalPricePerDay: listing.rental_price_per_day,
      minRentalDays: listing.min_rental_days,
      maxRentalDays: listing.max_rental_days,
      nftMintAddress: listing.nft_mint_address,
      sellerWallet: listing.seller_wallet,
      status: listing.status,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      expiresAt: listing.expires_at
    }));

    // 获取总数（用于分页）
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM marketplace_listings ml
      JOIN ai_personas ap ON ml.persona_id = ap.id
      WHERE ml.status = $1
      ${listingType ? 'AND ml.listing_type = $2' : ''}
      ${personalityType ? `AND ap.personality_type = $${listingType ? 3 : 2}` : ''}
    `;
    
    const countValues = [status];
    if (listingType) countValues.push(listingType);
    if (personalityType) countValues.push(personalityType);
    
    const totalResult = await Database.query(totalQuery, countValues);
    const total = parseInt(totalResult.rows[0].total);

    return NextResponse.json({
      success: true,
      listings: formattedListings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error: any) {
    console.error('❌ 浏览市场失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to browse marketplace' },
      { status: 500 }
    );
  }
}

// 获取特定上架的详细信息
export async function POST(request: NextRequest) {
  try {
    const { listingId } = await request.json();

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // 获取上架详情
    const listing = await Database.getMarketplaceListingById(listingId);
    
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // 格式化返回数据
    const formattedListing = {
      id: listing.id,
      personaId: listing.persona_id,
      personaName: (listing as any).persona_name,
      personalityType: (listing as any).personality_type,
      riskLevel: (listing as any).risk_level,
      avatarUrl: (listing as any).avatar_url,
      description: (listing as any).description,
      listingType: listing.listing_type,
      price: listing.price,
      rentalPricePerDay: listing.rental_price_per_day,
      minRentalDays: listing.min_rental_days,
      maxRentalDays: listing.max_rental_days,
      nftMintAddress: listing.nft_mint_address,
      sellerWallet: (listing as any).seller_wallet,
      status: listing.status,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      expiresAt: listing.expires_at
    };

    return NextResponse.json({
      success: true,
      listing: formattedListing
    });

  } catch (error: any) {
    console.error('❌ 获取上架详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get listing details' },
      { status: 500 }
    );
  }
}
