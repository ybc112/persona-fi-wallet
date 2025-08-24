import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createNft,
  mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createSignerFromKeypair,
  signerIdentity,
  generateSigner,
  percentAmount,
  publicKey,
  sol
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair } from '@solana/web3.js';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      personaId
    } = await request.json();

    console.log('🎨 接收到NFT铸造请求:', {
      walletAddress,
      personaId
    });

    if (!walletAddress || !personaId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 1. 获取AI角色信息
    const persona = await Database.getAIPersonaById(personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: 'AI角色不存在' },
        { status: 404 }
      );
    }

    // 2. 检查是否已经铸造
    if (persona.is_minted && persona.nft_mint_address) {
      return NextResponse.json(
        { success: false, error: '该AI角色已经铸造过NFT' },
        { status: 400 }
      );
    }

    console.log('🎨 使用Metaplex铸造NFT...');

    // 3. 设置Umi和服务器签名者
    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)
      .use(mplTokenMetadata());

    // 服务器私钥（用于支付gas费）
    const serverPrivateKey = process.env.SOLANA_PRIVATE_KEY!;
    console.log('🔐 服务器私钥长度:', serverPrivateKey.length);

    let serverKeypair: Keypair;
    try {
      if (serverPrivateKey.length === 64) {
        console.log('🔑 尝试使用64字节secretKey...');
        const secretKeyBytes = Uint8Array.from(Buffer.from(serverPrivateKey, 'hex'));
        serverKeypair = Keypair.fromSecretKey(secretKeyBytes);
      } else {
        const secretKeyArray = JSON.parse(serverPrivateKey);
        serverKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
      }
    } catch (error) {
      console.error('❌ 私钥解析失败:', error);
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      );
    }

    const serverSigner = createSignerFromKeypair(umi, fromWeb3JsKeypair(serverKeypair));
    umi.use(signerIdentity(serverSigner));

    console.log('✅ 服务器公钥:', serverSigner.publicKey);

    // 确保服务器支付账户（payer）在链上且有足够SOL
    console.log('🔍 检查服务器支付账户余额...');
    try {
      const payerBalance = await umi.rpc.getBalance(serverSigner.publicKey);
      console.log('💰 服务器账户余额:', payerBalance.basisPoints.toString(), 'lamports');
      if (payerBalance.basisPoints < 5000000n) {
        console.log('⚠️ 服务器账户余额不足，空投 1 SOL ...');
        const sig = await umi.rpc.airdrop(serverSigner.publicKey, sol(1));
        console.log('✅ 服务器空投成功:', sig);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (e) {
      console.log('⚠️ 检查服务器余额失败:', e);
    }

    // 4. 上传元数据到IPFS
    console.log('📤 上传元数据到IPFS...');

    const metadata = {
      name: persona.name,
      description: persona.description,
      image: persona.avatar_url,
      attributes: [
        {
          trait_type: "Personality Type",
          value: persona.personality_type
        },
        {
          trait_type: "Risk Level",
          value: persona.risk_level
        },
        {
          trait_type: "Specialization",
          value: persona.specialization || "General"
        }
      ],
      properties: {
        category: "image",
        files: [
          {
            uri: persona.avatar_url,
            type: "image/png"
          }
        ]
      }
    };

    // 使用Pinata上传元数据
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${persona.name}-metadata.json`
        }
      })
    });

    if (!pinataResponse.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    const pinataResult = await pinataResponse.json();
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${pinataResult.IpfsHash}`;
    console.log('✅ 元数据上传成功:', ipfsUrl);

    // 5. 生成NFT mint地址
    const mint = generateSigner(umi);

    // 6. 将用户钱包地址转换为Umi PublicKey
    const userWalletPublicKey = publicKey(walletAddress);

    // 7. 检查用户钱包余额并空投SOL（如果需要）
    console.log('🔍 检查用户钱包余额...');
    try {
      const balance = await umi.rpc.getBalance(userWalletPublicKey);
      console.log('💰 用户钱包余额:', balance.basisPoints.toString(), 'lamports');

      if (balance.basisPoints < 5000000n) { // 少于0.005 SOL
        console.log('⚠️ 用户钱包余额不足，先给用户空投一些SOL...');

        try {
          const airdropSignature = await umi.rpc.airdrop(userWalletPublicKey, sol(0.1));
          console.log('✅ 空投成功:', airdropSignature);

          // 等待确认
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (airdropError) {
          console.log('⚠️ 空投失败:', airdropError);
          return NextResponse.json(
            { success: false, error: '用户钱包余额不足且空投失败，请先向钱包充值一些SOL' },
            { status: 400 }
          );
        }
      }
    } catch (balanceError) {
      console.log('⚠️ 检查余额失败，继续尝试铸造:', balanceError);
    }

    // 8. 铸造NFT
    console.log('🎯 铸造NFT...');

    // 根据QuickNode官方指南，正确的createNft参数
    const createResult = await createNft(umi, {
      mint,
      name: persona.name,
      symbol: 'PERSONA',
      uri: ipfsUrl,
      sellerFeeBasisPoints: percentAmount(5), // 5% 版税
      creators: [
        {
          address: serverSigner.publicKey,
          verified: true,
          share: 100
        }
      ],
    }).sendAndConfirm(umi);

    console.log('✅ NFT铸造成功!');

    const mintAddress = mint.publicKey.toString();
    console.log('✅ NFT Mint地址:', mintAddress);
    console.log('🎯 NFT所有者:', walletAddress);

    // 9. 更新数据库
    console.log('💾 更新数据库...');
    await Database.updateAIPersonaNFT(personaId, mintAddress, true);

    return NextResponse.json({
      success: true,
      message: 'NFT铸造成功！NFT已创建到服务器账户，您可以稍后转移到您的钱包。',
      mintAddress,
      owner: serverSigner.publicKey.toString(), // 当前所有者是服务器
      targetUser: walletAddress, // 目标用户
      metadataUri: ipfsUrl,
      explorerUrl: `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`,
      signature: createResult.signature
    });

  } catch (error) {
    console.error('❌ NFT铸造错误:', error);
    return NextResponse.json(
      { success: false, error: 'NFT铸造失败，请重试' },
      { status: 500 }
    );
  }
}
