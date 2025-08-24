import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

// GET - 获取评价列表和统计
export async function GET(
  request: NextRequest,
  { params }: { params: { personaId: string } }
) {
  try {
    // 修复：确保params是已解析的，使用await
    const personaId = parseInt(params.personaId as string);
    
    if (isNaN(personaId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid persona ID'
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    
    const options = {
      limit: parseInt(searchParams.get('limit') || '10'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: (searchParams.get('sort_by') as any) || 'created_at',
      sort_order: (searchParams.get('sort_order') as any) || 'DESC',
      verified_only: searchParams.get('verified_only') === 'true',
      rating_filter: searchParams.get('rating_filter') ? parseInt(searchParams.get('rating_filter')!) : undefined
    };
    
    // 并行获取评价列表和统计数据
    const [reviews, stats] = await Promise.all([
      Database.getPersonaReviews(personaId, options),
      Database.getReviewStats(personaId)
    ]);
    
    return NextResponse.json({
      success: true,
      data: { 
        reviews, 
        stats,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: stats.total_reviews
        }
      }
    });
  } catch (error: any) {
    console.error('获取评价失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取评价失败'
    }, { status: 500 });
  }
}

// POST - 创建评价
export async function POST(
  request: NextRequest,
  { params }: { params: { personaId: string } }
) {
  try {
    // 修复：确保params是已解析的，使用await
    const personaId = parseInt(params.personaId as string);
    
    if (isNaN(personaId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid persona ID'
      }, { status: 400 });
    }

    const { walletAddress, rating, comment } = await request.json();
    
    // 验证输入
    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: '钱包地址不能为空'
      }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: '评分必须在1-5星之间'
      }, { status: 400 });
    }

    // 验证用户是否存在
    const user = await Database.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在，请先连接钱包'
      }, { status: 404 });
    }

    // 验证AI角色是否存在
    const persona = await Database.getAIPersonaById(personaId);
    if (!persona) {
      return NextResponse.json({
        success: false,
        error: 'AI角色不存在'
      }, { status: 404 });
    }

    // 检查用户是否为AI角色的创建者（创建者不能评价自己的AI）
    if (persona.creator_id === user.id) {
      return NextResponse.json({
        success: false,
        error: '不能评价自己创建的AI角色'
      }, { status: 403 });
    }
    
    // 检查是否已购买该AI角色
    const hasPurchased = await Database.hasUserPurchasedPersona(user.id, personaId);
    
    // 创建评价
    const review = await Database.createReview({
      persona_id: personaId,
      reviewer_id: user.id,
      rating,
      comment: comment?.trim() || null,
      is_verified_purchase: hasPurchased
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...review,
        reviewer_wallet: user.wallet_address,
        reviewer_name: user.name
      },
      message: '评价提交成功！'
    });
  } catch (error: any) {
    console.error('创建评价失败:', error);
    
    // 处理重复评价错误
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return NextResponse.json({
        success: false,
        error: '您已经评价过这个AI角色，评价已更新'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || '评价提交失败'
    }, { status: 500 });
  }
}