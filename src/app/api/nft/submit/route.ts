import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSignerFromKeypair, 
  signerIdentity
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair } from '@solana/web3.js';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      signedTransaction,
      transactionData
    } = await request.json();

    console.log('📝 接收到已签名交易:', {
      transactionData
    });

    if (!signedTransaction || !transactionData) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 1. 设置Umi
    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)
      .use(mplTokenMetadata());

    // 服务器私钥（用于验证）
    const serverPrivateKey = process.env.SOLANA_PRIVATE_KEY!;
    
    let serverKeypair: Keypair;
    try {
      if (serverPrivateKey.length === 64) {
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

    // 2. 反序列化已签名的交易
    console.log('🔄 处理已签名交易...');
    
    const transactionBytes = Buffer.from(signedTransaction, 'base64');
    const transaction = umi.transactions.deserialize(transactionBytes);

    // 3. 发送交易到区块链
    console.log('🚀 发送交易到区块链...');
    
    const result = await umi.rpc.sendTransaction(transaction);
    
    console.log('✅ 交易发送成功! 签名:', result);

    // 4. 更新数据库
    console.log('💾 更新数据库...');
    await Database.updateAIPersonaNFT(
      transactionData.personaId, 
      transactionData.mintAddress, 
      true
    );

    return NextResponse.json({
      success: true,
      message: 'NFT铸造成功！',
      mintAddress: transactionData.mintAddress,
      metadataUri: transactionData.metadataUri,
      explorerUrl: `https://explorer.solana.com/address/${transactionData.mintAddress}?cluster=devnet`,
      signature: result
    });

  } catch (error) {
    console.error('❌ 交易提交错误:', error);
    return NextResponse.json(
      { success: false, error: 'NFT铸造失败，请重试' },
      { status: 500 }
    );
  }
}
