import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

// 获取用户的AI角色列表
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

    console.log('📋 获取用户AI角色列表:', { walletAddress });

    // 获取用户的AI角色列表
    const personas = await Database.getUserAIPersonas(walletAddress);

    // 转换数据格式以匹配前端期望的格式
    const formattedPersonas = personas.map(persona => ({
      id: persona.id,
      name: persona.name,
      personalityType: persona.personality_type,
      riskLevel: persona.risk_level,
      specialization: persona.specialization,
      description: persona.description,
      avatarUrl: persona.avatar_url,
      nftMintAddress: persona.nft_mint_address,
      isMinted: persona.is_minted || false,
      isListed: false, // 这个需要从marketplace表中查询
      createdAt: persona.created_at,
      creatorWallet: walletAddress
    }));

    console.log(`✅ 找到 ${formattedPersonas.length} 个AI角色`);

    return NextResponse.json({
      success: true,
      personas: formattedPersonas
    });

  } catch (error: any) {
    console.error('❌ 获取用户AI角色列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch personas' },
      { status: 500 }
    );
  }
}
