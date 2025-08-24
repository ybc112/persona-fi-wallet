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
  createGenericFile
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { clusterApiUrl, Keypair } from '@solana/web3.js';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      personaId
    } = await request.json();

    console.log('🎨 准备NFT铸造交易:', {
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

    console.log('🎨 使用Metaplex准备NFT交易...');

    // 3. 设置Umi和服务器签名者
    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)
      .use(mplTokenMetadata());

    // 服务器私钥（用于支付gas费）
    const serverPrivateKey = process.env.SOLANA_PRIVATE_KEY!;
    console.log('🔐 服务器私钥长度:', serverPrivateKey.length);
    
    let serverKeypair: Keypair;
    try {
      if (serverPrivateKey.length === 64) {
        // 如果是64字符的hex字符串
        console.log('🔑 尝试使用64字节secretKey...');
        const secretKeyBytes = Uint8Array.from(Buffer.from(serverPrivateKey, 'hex'));
        serverKeypair = Keypair.fromSecretKey(secretKeyBytes);
      } else {
        // 如果是JSON数组格式
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

    // 7. 构建NFT创建交易（但不执行）
    console.log('🔨 构建NFT创建交易...');
    
    const createNftBuilder = createNft(umi, {
      mint,
      name: persona.name,
      symbol: 'PERSONA',
      uri: ipfsUrl,
      sellerFeeBasisPoints: percentAmount(5), // 5% 版税
      // 关键：直接指定NFT的所有者为用户钱包
      tokenOwner: userWalletPublicKey,
      // 创建者信息（用于版税）
      creators: [
        {
          address: serverSigner.publicKey,
          verified: true,
          share: 100
        }
      ],
    });

    // 8. 构建交易但不发送
    const transaction = await createNftBuilder.buildAndSign(umi);
    
    console.log('✅ 交易构建成功');

    // 9. 序列化交易以便前端签名
    const serializedTransaction = umi.transactions.serialize(transaction);

    return NextResponse.json({
      success: true,
      message: '交易准备完成，请在前端签名',
      mintAddress: mint.publicKey.toString(),
      metadataUri: ipfsUrl,
      serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
      // 返回这些信息供前端使用
      transactionData: {
        personaId,
        mintAddress: mint.publicKey.toString(),
        metadataUri: ipfsUrl
      }
    });

  } catch (error) {
    console.error('❌ NFT交易准备错误:', error);
    return NextResponse.json(
      { success: false, error: 'NFT交易准备失败，请重试' },
      { status: 500 }
    );
  }
}
