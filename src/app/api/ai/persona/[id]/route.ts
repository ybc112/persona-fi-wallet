import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

// 获取单个AI角色详情
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

    console.log('🔍 获取AI角色详情:', { personaId });

    // 获取AI角色信息
    const persona = await Database.getAIPersonaById(personaId);

    if (!persona) {
      return NextResponse.json(
        { success: false, error: 'AI persona not found' },
        { status: 404 }
      );
    }

    // 获取创建者钱包地址
    const creator = await Database.getUserById(persona.creator_id);
    
    // 转换数据格式
    const formattedPersona = {
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
      creatorWallet: creator?.wallet_address || ''
    };

    console.log('✅ AI角色详情获取成功');

    return NextResponse.json({
      success: true,
      persona: formattedPersona
    });

  } catch (error: any) {
    console.error('❌ 获取AI角色详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch persona details' },
      { status: 500 }
    );
  }
}
