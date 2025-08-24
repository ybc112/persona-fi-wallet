import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  DataV2
} from '@metaplex-foundation/mpl-token-metadata';
import { getRobustConnection } from '@/utils/rpcConfig';

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
  };
}

export interface MintNFTParams {
  creatorWallet: PublicKey;
  metadata: NFTMetadata;
  metadataUri: string;
  sellerFeeBasisPoints?: number;
}

export interface MintNFTResult {
  mintAddress: string;
  tokenAccount: string;
  metadataAccount: string;
  transactionSignature: string;
  unsignedTransaction?: string;
}

/**
 * 创建NFT元数据账户地址
 */
function findMetadataAddress(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

/**
 * 上传NFT元数据到IPFS
 */
export async function uploadNFTMetadata(metadata: NFTMetadata): Promise<string> {
  try {
    const response = await fetch('/api/ipfs/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload metadata: ${response.statusText}`);
    }

    const result = await response.json();
    return result.ipfsHash;
  } catch (error) {
    console.error('Error uploading NFT metadata:', error);
    throw error;
  }
}

/**
 * 铸造NFT
 */
export async function mintNFT(params: MintNFTParams): Promise<MintNFTResult> {
  const { creatorWallet, metadata, metadataUri, sellerFeeBasisPoints = 500 } = params;
  
  try {
    console.log('🎨 开始铸造NFT...');
    console.log('创建者钱包:', creatorWallet.toBase58());
    console.log('元数据URI:', metadataUri);

    const connection = getRobustConnection();
    
    // 1. 创建一个新的Keypair作为mint账户
    const mintKeypair = Keypair.generate();
    console.log('🔑 生成Mint地址:', mintKeypair.publicKey.toBase58());

    // 2. 获取最小租金
    const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // 3. 创建mint账户
    console.log('💰 创建Mint账户...');
    const createMintAccountInstruction = SystemProgram.createAccount({
      fromPubkey: creatorWallet,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    });

    // 4. 初始化mint
    const initializeMintInstruction = createInitializeMintInstruction(
      mintKeypair.publicKey,
      0, // decimals (NFT应该是0)
      creatorWallet, // mint authority
      creatorWallet, // freeze authority
      TOKEN_PROGRAM_ID
    );

    // 5. 获取关联代币账户地址
    console.log('🏦 获取关联代币账户地址...');
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      creatorWallet
    );

    // 6. 创建关联代币账户指令
    const createAssociatedTokenAccountInstr = createAssociatedTokenAccountInstruction(
      creatorWallet, // payer
      associatedTokenAddress, // associated token account
      creatorWallet, // owner
      mintKeypair.publicKey // mint
    );

    // 7. 铸造代币到关联账户
    console.log('⚡ 铸造代币...');
    const mintToInstruction = createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAddress,
      creatorWallet,
      1 // amount (NFT只铸造1个)
    );

    // 8. 创建元数据账户
    console.log('📝 创建元数据账户...');
    const [metadataAccount] = findMetadataAddress(mintKeypair.publicKey);
    
    const metadataData: DataV2 = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints,
      creators: [
        {
          address: creatorWallet,
          verified: true,
          share: 100,
        },
      ],
      collection: null,
      uses: null,
    };

    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAccount,
        mint: mintKeypair.publicKey,
        mintAuthority: creatorWallet,
        payer: creatorWallet,
        updateAuthority: creatorWallet,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
      {
        createMetadataAccountArgsV3: {
          data: metadataData,
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    // 9. 构建交易
    console.log('📦 构建交易...');
    const transaction = new Transaction().add(
      createMintAccountInstruction,
      initializeMintInstruction,
      createAssociatedTokenAccountInstr,
      mintToInstruction,
      createMetadataInstruction
    );

    // 获取最新的区块哈希
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorWallet;

    // 部分签名（mint账户）
    transaction.partialSign(mintKeypair);

    console.log('🚀 交易构建完成，等待用户签名...');

    // 返回未签名的交易，让前端处理用户签名
    return {
      mintAddress: mintKeypair.publicKey.toBase58(),
      tokenAccount: associatedTokenAddress.toBase58(),
      metadataAccount: metadataAccount.toBase58(),
      transactionSignature: 'pending_user_signature',
      unsignedTransaction: transaction.serialize({ requireAllSignatures: false }).toString('base64')
    };

  } catch (error) {
    console.error('❌ NFT铸造失败:', error);
    throw error;
  }
}

/**
 * 简化的NFT铸造函数，返回构建好的交易供前端签名
 */
export async function buildNFTMintTransaction(params: MintNFTParams): Promise<{
  transaction: Transaction;
  mintKeypair: Keypair;
  mintAddress: string;
  tokenAccount: string;
  metadataAccount: string;
}> {
  const { creatorWallet, metadata, metadataUri, sellerFeeBasisPoints = 500 } = params;

  const connection = getRobustConnection();
  const mintKeypair = Keypair.generate();

  // 获取关联代币账户地址
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    creatorWallet
  );

  // 获取元数据账户地址
  const [metadataAccount] = findMetadataAddress(mintKeypair.publicKey);

  // 获取最小租金
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  // 构建所有指令
  const instructions = [
    // 创建mint账户
    SystemProgram.createAccount({
      fromPubkey: creatorWallet,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),

    // 初始化mint
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0,
      creatorWallet,
      creatorWallet,
      TOKEN_PROGRAM_ID
    ),

    // 创建关联代币账户
    createAssociatedTokenAccountInstruction(
      creatorWallet,
      associatedTokenAddress,
      creatorWallet,
      mintKeypair.publicKey
    ),

    // 铸造代币
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAddress,
      creatorWallet,
      1
    ),

    // 创建元数据
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAccount,
        mint: mintKeypair.publicKey,
        mintAuthority: creatorWallet,
        payer: creatorWallet,
        updateAuthority: creatorWallet,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadataUri,
            sellerFeeBasisPoints,
            creators: [
              {
                address: creatorWallet,
                verified: true,
                share: 100,
              },
            ],
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  ];

  // 构建交易
  const transaction = new Transaction().add(...instructions);

  // 获取最新区块哈希
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorWallet;

  // 部分签名（mint账户）
  transaction.partialSign(mintKeypair);

  return {
    transaction,
    mintKeypair,
    mintAddress: mintKeypair.publicKey.toBase58(),
    tokenAccount: associatedTokenAddress.toBase58(),
    metadataAccount: metadataAccount.toBase58(),
  };
}
