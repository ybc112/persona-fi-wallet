import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud';

export async function POST(request: NextRequest) {
  try {
    const metadata = await request.json();

    console.log('📝 上传NFT元数据到IPFS:', metadata.name);

    if (!process.env.PINATA_JWT) {
      throw new Error('PINATA_JWT environment variable is not set');
    }

    // 上传JSON元数据到Pinata
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    console.log('✅ 元数据上传成功:', ipfsUrl);

    return NextResponse.json({
      success: true,
      ipfsHash,
      ipfsUrl,
      gatewayUrl: ipfsUrl
    });

  } catch (error: any) {
    console.error('❌ 元数据上传失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '元数据上传失败',
        details: error.response?.data || null
      },
      { status: 500 }
    );
  }
}
