import { NextRequest, NextResponse } from 'next/server'
import { Keypair } from '@solana/web3.js'
import Database from '@/lib/database'
import { UmiNFTMintingService } from '@/services/nftMintingServiceUmi'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, personaId } = await request.json()

    console.log('🎨 接收到Umi NFT铸造请求:', {
      walletAddress,
      personaId
    })

    if (!walletAddress || !personaId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 1. 获取AI角色信息
    const persona = await Database.getAIPersonaById(personaId)
    if (!persona) {
      return NextResponse.json(
        { success: false, error: 'AI角色不存在' },
        { status: 404 }
      )
    }

    // 2. 检查是否已经铸造
    if (persona.is_minted && persona.nft_mint_address) {
      return NextResponse.json(
        { success: false, error: '该AI角色已经铸造过NFT' },
        { status: 400 }
      )
    }

    // 3. 检查必要的环境变量
    if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      throw new Error('Missing SOLANA_RPC_URL environment variable')
    }

    if (!process.env.SOLANA_PRIVATE_KEY) {
      throw new Error('Missing SOLANA_PRIVATE_KEY environment variable')
    }

    // 4. 创建服务器签名者
    const serverPrivateKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY)
    const serverKeypair = Keypair.fromSecretKey(new Uint8Array(serverPrivateKey))

    console.log('🔑 服务器签名者地址:', serverKeypair.publicKey.toBase58())

    // 5. 准备NFT数据
    const nftData = {
      name: persona.name,
      symbol: 'PFAI',
      description: persona.description || `${persona.name} - AI Investment Advisor`,
      imageUrl: persona.avatar_url || '',
      attributes: [
        { trait_type: 'Personality Type', value: persona.personality_type },
        { trait_type: 'Risk Level', value: persona.risk_level },
        { trait_type: 'Specialization', value: persona.specialization || 'General' },
        { trait_type: 'Created At', value: new Date(persona.created_at).toISOString().split('T')[0] }
      ]
    }

    console.log('📋 NFT数据准备完成:', nftData.name)

    // 6. 使用Umi服务铸造NFT
    console.log('🚀 开始使用Umi铸造NFT...')
    
    const mintResult = await UmiNFTMintingService.mintNFT({
      creatorKeypair: serverKeypair,
      userWalletAddress: walletAddress,
      nftData: nftData,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    })

    if (!mintResult.success) {
      console.error('❌ NFT铸造失败:', mintResult.error)
      return NextResponse.json(
        { success: false, error: mintResult.error || 'NFT铸造失败' },
        { status: 500 }
      )
    }

    console.log('✅ NFT铸造成功!', {
      mintAddress: mintResult.mintAddress,
      transactionSignature: mintResult.transactionSignature
    })

    // 7. 更新数据库
    console.log('💾 更新数据库...')
    try {
      await Database.updateAIPersonaNFT(
        personaId,
        mintResult.mintAddress!,
        true
      )
      console.log('✅ 数据库更新成功')
    } catch (dbError) {
      console.error('⚠️ 数据库更新失败，但NFT已铸造成功:', dbError)
      // NFT已经铸造成功，数据库更新失败不应该影响返回结果
    }

    // 8. 返回成功结果
    return NextResponse.json({
      success: true,
      message: 'NFT铸造成功！',
      mintAddress: mintResult.mintAddress,
      transactionSignature: mintResult.transactionSignature,
      metadataUri: mintResult.metadataUri,
      explorerUrl: `https://explorer.solana.com/address/${mintResult.mintAddress}?cluster=devnet`,
      personaId: personaId,
      nftInfo: {
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        attributes: nftData.attributes
      }
    })

  } catch (error: any) {
    console.error('❌ NFT铸造API错误:', error)
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = 'NFT铸造失败，请重试'
    let statusCode = 500

    if (error.message?.includes('insufficient funds')) {
      errorMessage = '服务器余额不足，请联系管理员'
      statusCode = 503
    } else if (error.message?.includes('timeout')) {
      errorMessage = '网络超时，请重试'
      statusCode = 408
    } else if (error.message?.includes('Missing')) {
      errorMessage = '服务器配置错误'
      statusCode = 500
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}
