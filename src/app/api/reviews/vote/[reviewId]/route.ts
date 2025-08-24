import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

// POST - 投票评价有用性
export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    // 修复：确保params是已解析的，使用await
    const reviewId = parseInt(params.reviewId as string);
    
    if (isNaN(reviewId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid review ID'
      }, { status: 400 });
    }

    const { walletAddress, isHelpful } = await request.json();
    
    // 验证输入
    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: '钱包地址不能为空'
      }, { status: 400 });
    }

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: '投票类型无效'
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

    // 投票
    await Database.voteReviewHelpfulness(reviewId, user.id, isHelpful);
    
    return NextResponse.json({
      success: true,
      message: '投票成功！'
    });
  } catch (error: any) {
    console.error('投票失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '投票失败'
    }, { status: 500 });
  }
}

// DELETE - 取消投票
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    // 修复：确保params是已解析的，使用await
    const reviewId = parseInt(params.reviewId as string);
    
    if (isNaN(reviewId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid review ID'
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: '钱包地址不能为空'
      }, { status: 400 });
    }

    // 验证用户是否存在
    const user = await Database.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    // 删除投票记录
    await Database.query(
      'DELETE FROM review_helpfulness WHERE review_id = $1 AND user_id = $2',
      [reviewId, user.id]
    );

    // 更新评价的有用计数
    await Database.query(`
      UPDATE ai_persona_reviews 
      SET helpful_count = (
        SELECT COUNT(*) 
        FROM review_helpfulness 
        WHERE review_id = $1 AND is_helpful = true
      )
      WHERE id = $1
    `, [reviewId]);
    
    return NextResponse.json({
      success: true,
      message: '取消投票成功！'
    });
  } catch (error: any) {
    console.error('取消投票失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '取消投票失败'
    }, { status: 500 });
  }
}