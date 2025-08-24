import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * 从URL下载图片并上传到IPFS
 */
export async function uploadImageToIPFS(imageUrl: string, filename?: string): Promise<IPFSUploadResult> {
  try {
    console.log('Downloading image from:', imageUrl);
    
    // 1. 下载图片
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30秒超时
    });

    if (!imageResponse.data) {
      return {
        success: false,
        error: 'Failed to download image'
      };
    }

    // 2. 创建FormData
    const formData = new FormData();
    const buffer = Buffer.from(imageResponse.data);
    const finalFilename = filename || `ai-avatar-${Date.now()}.png`;
    
    formData.append('file', buffer, {
      filename: finalFilename,
      contentType: 'image/png'
    });

    // 3. 添加元数据
    const metadata = JSON.stringify({
      name: finalFilename,
      description: 'AI Generated Avatar for PersonaFi',
      image: finalFilename,
      attributes: [
        {
          trait_type: 'Type',
          value: 'AI Avatar'
        },
        {
          trait_type: 'Generated',
          value: new Date().toISOString()
        }
      ]
    });
    
    formData.append('pinataMetadata', metadata);

    // 4. 上传到Pinata
    console.log('Uploading to IPFS...');
    const uploadResponse = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders()
        },
        timeout: 60000, // 60秒超时
      }
    );

    const result: PinataResponse = uploadResponse.data;
    const ipfsUrl = `${PINATA_GATEWAY}/${result.IpfsHash}`;

    console.log('Upload successful:', result.IpfsHash);

    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: ipfsUrl
    };

  } catch (error) {
    console.error('IPFS upload error:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `Upload failed: ${error.response.status} ${error.response.statusText}`;
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Network error: No response received';
      } else {
        errorMessage = `Request error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 直接上传Buffer到IPFS
 */
export async function uploadBufferToIPFS(
  buffer: Buffer, 
  filename: string, 
  contentType: string = 'image/png'
): Promise<IPFSUploadResult> {
  try {
    const formData = new FormData();
    
    formData.append('file', buffer, {
      filename: filename,
      contentType: contentType
    });

    const metadata = JSON.stringify({
      name: filename,
      description: 'AI Generated Avatar for PersonaFi'
    });
    
    formData.append('pinataMetadata', metadata);

    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders()
        },
        timeout: 60000,
      }
    );

    const result: PinataResponse = response.data;
    const ipfsUrl = `${PINATA_GATEWAY}/${result.IpfsHash}`;

    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: ipfsUrl
    };

  } catch (error) {
    console.error('IPFS upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * 验证IPFS连接
 */
export async function testIPFSConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      timeout: 10000
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('IPFS connection test failed:', error);
    return false;
  }
}

/**
 * 获取IPFS文件信息
 */
export async function getIPFSFileInfo(ipfsHash: string) {
  try {
    const response = await axios.get(`${PINATA_API_URL}/data/pinList?hashContains=${ipfsHash}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to get IPFS file info:', error);
    return null;
  }
}
