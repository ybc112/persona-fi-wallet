import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token';
import Database from '@/lib/database';
import { getRobustConnection } from '@/utils/rpcConfig';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, personaId } = await request.json();

    console.log('🎨 接收到用户NFT铸造请求:', {
      walletAddress,
      personaId
    });

    if (!walletAddress || !personaId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 获取AI角色信息
    const persona = await Database.getAIPersonaById(personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: 'AI persona not found' },
        { status: 404 }
      );
    }

    console.log('🎨 准备用户钱包NFT铸造交易...');

    const connection = getRobustConnection();
    const userPublicKey = new PublicKey(walletAddress);

    // 检查用户钱包余额
    console.log('🔍 检查用户钱包余额...');
    const userBalance = await connection.getBalance(userPublicKey);
    console.log('💰 用户钱包余额:', userBalance, 'lamports');

    if (userBalance < 20000000) { // 0.02 SOL (估算的铸造费用)
      return NextResponse.json(
        { success: false, error: 'Insufficient balance for minting. Need at least 0.02 SOL.' },
        { status: 400 }
      );
    }

    // 上传元数据到IPFS
    console.log('📤 上传元数据到IPFS...');
    const metadata = {
      name: persona.name,
      symbol: 'PFAI',
      description: persona.description || `${persona.name} - AI Investment Advisor`,
      image: persona.avatar_url || '',
      attributes: [
        { trait_type: 'Personality Type', value: persona.personality_type },
        { trait_type: 'Risk Level', value: persona.risk_level },
        { trait_type: 'Specialization', value: persona.specialization || 'General' }
      ],
      properties: {
        files: [
          {
            uri: persona.avatar_url || '',
            type: 'image/png'
          }
        ],
        category: 'image'
      }
    };

    const metadataResponse = await fetch(`${request.nextUrl.origin}/api/ipfs/upload-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });

    if (!metadataResponse.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    const { ipfsHash } = await metadataResponse.json();
    const metadataUri = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    console.log('✅ 元数据上传成功:', metadataUri);

    // 创建mint账户
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // 获取关联代币账户地址
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      userPublicKey
    );

    console.log('🎯 构建用户钱包NFT铸造交易...');

    // 创建交易
    const transaction = new Transaction();

    // 1. 创建mint账户
    const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userPublicKey, // 用户支付所有费用
        newAccountPubkey: mint,
        lamports: rentExemptBalance,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. 初始化mint (NFT特征: 0 decimals, supply 1)
    transaction.add(
      createInitializeMintInstruction(
        mint,
        0, // decimals = 0 (NFT特征)
        userPublicKey, // mint authority
        userPublicKey  // freeze authority
      )
    );

    // 3. 创建关联代币账户
    transaction.add(
      createAssociatedTokenAccountInstruction(
        userPublicKey, // 用户支付创建费用
        associatedTokenAccount,
        userPublicKey,
        mint
      )
    );

    // 4. 铸造1个代币到用户账户 (NFT特征: supply = 1)
    transaction.add(
      createMintToInstruction(
        mint,
        associatedTokenAccount,
        userPublicKey, // mint authority
        1 // amount = 1 (NFT特征)
      )
    );

    // 获取最新区块哈希
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // 服务器使用mint keypair进行部分签名（必要）
    transaction.partialSign(mintKeypair);

    console.log('✅ 用户钱包NFT铸造交易准备完成!');
    console.log('✅ NFT Mint地址:', mint.toBase58());
    console.log('🎯 NFT所有者:', userPublicKey.toBase58());

    return NextResponse.json({
      success: true,
      mintAddress: mint.toBase58(),
      tokenAccount: associatedTokenAccount.toBase58(),
      metadataUri,
      // 返回部分签名的交易，让前端完成用户签名并发送
      unsignedTransaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      estimatedFee: 0.01, // SOL (降低估算费用，因为没有元数据账户)
      personaId,
      // NFT特征信息
      nftInfo: {
        name: persona.name,
        symbol: 'PFAI',
        decimals: 0,
        supply: 1,
        description: persona.description || `${persona.name} - AI Investment Advisor`
      }
    });

  } catch (error: any) {
    console.error('❌ 用户钱包NFT铸造准备失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'NFT minting preparation failed' },
      { status: 500 }
    );
  }
}
