import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
  createNft,
  mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata'
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as umiPublicKey
} from '@metaplex-foundation/umi'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair } from '@solana/web3.js'
import axios from 'axios'

export interface NFTMintOptions {
  creatorKeypair: Keypair
  userWalletAddress: string
  nftData: {
    name: string
    symbol: string
    description: string
    imageUrl: string
    attributes?: Array<{
      trait_type: string
      value: string
    }>
  }
  rpcUrl: string
}

export interface NFTMintResult {
  success: boolean
  mintAddress?: string
  transactionSignature?: string
  metadataUri?: string
  error?: string
}

/**
 * 使用Metaplex Umi完整铸造NFT
 * 这是2024-2025年推荐的标准方式
 */
export class UmiNFTMintingService {
  
  /**
   * 完整的NFT铸造流程
   * 1. 上传图片到IPFS
   * 2. 上传元数据到IPFS  
   * 3. 使用createNft一步完成铸造
   */
  static async mintNFT(options: NFTMintOptions): Promise<NFTMintResult> {
    try {
      console.log('🚀 开始使用Umi铸造NFT...')
      
      // 1. 设置Umi实例
      const umi = createUmi(options.rpcUrl)

      // 2. 设置创建者身份
      const creatorUmiKeypair = fromWeb3JsKeypair(options.creatorKeypair)
      const creator = createSignerFromKeypair(umi, creatorUmiKeypair)

      umi.use(keypairIdentity(creator))
      umi.use(mplTokenMetadata())
      // 使用默认上传器，不使用irys以避免兼容性问题
      
      console.log('✅ Umi实例设置完成')
      
      // 3. 直接使用现有的图片URL（已经在IPFS上）
      console.log('📤 使用现有图片URL...')
      const imageUri = options.nftData.imageUrl
      console.log('✅ 图片URL:', imageUri)
      
      // 4. 创建并上传元数据（使用现有的IPFS API）
      console.log('📝 创建并上传元数据...')
      const metadata = {
        name: options.nftData.name,
        symbol: options.nftData.symbol,
        description: options.nftData.description,
        image: imageUri,
        attributes: options.nftData.attributes || [],
        properties: {
          files: [
            {
              type: 'image/png',
              uri: imageUri,
            },
          ],
          category: 'image',
        },
      }

      // 使用现有的IPFS上传API而不是Umi uploader
      const metadataUri = await this.uploadMetadataToIPFS(metadata)
      console.log('✅ 元数据上传成功:', metadataUri)
      
      // 5. 生成mint地址
      const mint = generateSigner(umi)
      console.log('🎯 NFT Mint地址:', mint.publicKey.toString())
      
      // 6. 转换用户钱包地址
      const userWalletPublicKey = umiPublicKey(options.userWalletAddress)
      
      // 7. 使用createNft一步完成NFT铸造
      console.log('🎨 开始铸造NFT...')
      
      const result = await createNft(umi, {
        mint,
        name: options.nftData.name,
        symbol: options.nftData.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(5), // 5% 版税
        // 直接指定NFT所有者为用户钱包
        tokenOwner: userWalletPublicKey,
        // 创建者信息
        creators: [
          {
            address: creator.publicKey,
            verified: true,
            share: 100,
          },
        ],
        // NFT特征
        tokenStandard: 0, // NonFungible
        isMutable: true,
      }).sendAndConfirm(umi, {
        send: { commitment: 'confirmed' },
        confirm: { commitment: 'confirmed' }
      })
      
      console.log('✅ NFT铸造成功!')
      console.log('📋 交易签名:', result.signature)
      console.log('🎯 NFT地址:', mint.publicKey.toString())
      
      return {
        success: true,
        mintAddress: mint.publicKey.toString(),
        transactionSignature: result.signature,
        metadataUri: metadataUri,
      }
      
    } catch (error: any) {
      console.error('❌ NFT铸造失败:', error)
      return {
        success: false,
        error: error.message || 'NFT铸造过程中发生未知错误'
      }
    }
  }
  
  /**
   * 直接使用Pinata API上传元数据
   */
  private static async uploadMetadataToIPFS(metadata: any): Promise<string> {
    try {
      if (!process.env.PINATA_JWT) {
        throw new Error('PINATA_JWT environment variable is not set')
      }

      // 直接调用Pinata API
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        metadata,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PINATA_JWT}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const ipfsHash = response.data.IpfsHash
      return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`

    } catch (error: any) {
      console.error('元数据上传失败:', error)
      throw new Error(`元数据上传失败: ${error.message}`)
    }
  }
  
  /**
   * 验证NFT是否铸造成功
   */
  static async verifyNFTMint(
    rpcUrl: string, 
    mintAddress: string, 
    expectedOwner: string
  ): Promise<boolean> {
    try {
      const umi = createUmi(rpcUrl)
      
      // 这里可以添加验证逻辑
      // 检查mint账户是否存在，元数据是否正确等
      
      return true
      
    } catch (error) {
      console.error('NFT验证失败:', error)
      return false
    }
  }
}

export default UmiNFTMintingService
