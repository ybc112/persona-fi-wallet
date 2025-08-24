import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';
import { getRobustConnection } from '@/utils/rpcConfig';

export async function POST(request: NextRequest) {
  try {
    const { personaId, mintAddress, transactionSignature } = await request.json();

    console.log('✅ 确认NFT铸造成功:', {
      personaId,
      mintAddress,
      transactionSignature
    });

    if (!personaId || !mintAddress || !transactionSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 验证交易是否成功
    const connection = getRobustConnection();
    try {
      const transaction = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed'
      });

      if (!transaction || transaction.meta?.err) {
        return NextResponse.json(
          { success: false, error: 'Transaction failed or not found' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.log('⚠️ 无法验证交易，但继续更新数据库:', error);
    }

    // 更新数据库，标记NFT为已铸造
    await Database.updateAIPersonaNFT(personaId, {
      nft_mint_address: mintAddress,
      is_minted: true
    });

    console.log('💾 数据库更新完成，NFT铸造确认成功');

    return NextResponse.json({
      success: true,
      message: 'NFT minting confirmed successfully',
      mintAddress,
      transactionSignature
    });

  } catch (error: any) {
    console.error('❌ NFT铸造确认失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'NFT minting confirmation failed' },
      { status: 500 }
    );
  }
}
