import OpenAI from 'openai';
import { uploadImageToIPFS, type IPFSUploadResult } from './ipfsService';

// 初始化豆包客户端
const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

// AI角色类型对应的头像风格
const AVATAR_STYLES = {
  'aggressive-trader': {
    style: 'cyberpunk digital art',
    description: 'aggressive crypto trader with glowing eyes, futuristic helmet, neon colors',
    mood: 'intense and focused'
  },
  'conservative-advisor': {
    style: 'professional portrait',
    description: 'wise financial advisor with glasses, suit, calm expression',
    mood: 'trustworthy and stable'
  },
  'defi-expert': {
    style: 'sci-fi digital art',
    description: 'DeFi expert with holographic displays, blockchain symbols, blue glow',
    mood: 'innovative and tech-savvy'
  },
  'meme-hunter': {
    style: 'cartoon digital art',
    description: 'meme coin hunter with playful expression, colorful background, fun elements',
    mood: 'energetic and playful'
  },
  'nft-specialist': {
    style: 'artistic digital portrait',
    description: 'NFT specialist surrounded by digital art, creative aura, artistic elements',
    mood: 'creative and visionary'
  },
  'gamefi-pro': {
    style: 'gaming character art',
    description: 'GameFi expert with gaming elements, virtual world background, dynamic pose',
    mood: 'adventurous and strategic'
  }
};

export interface AvatarGenerationOptions {
  personalityType: keyof typeof AVATAR_STYLES;
  customPrompt?: string;
  gender?: 'male' | 'female' | 'neutral';
  artStyle?: 'realistic' | 'anime' | 'cartoon' | 'cyberpunk';
}

export interface AvatarGenerationResult {
  success: boolean;
  imageUrl?: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
  prompt?: string;
}

/**
 * 生成AI角色头像
 */
export async function generateAIAvatar(options: AvatarGenerationOptions): Promise<AvatarGenerationResult> {
  try {
    const style = AVATAR_STYLES[options.personalityType];

    // 构建提示词
    let prompt = buildPrompt(options, style);

    console.log('Generating avatar with prompt:', prompt);

    const response = await openai.images.generate({
      model: "doubao-seedream-3-0-t2i-250415",
      prompt: prompt,
      size: "1024x1024",
      response_format: "url"
    });

    if (response.data && response.data[0] && response.data[0].url) {
      const imageUrl = response.data[0].url;

      return {
        success: true,
        imageUrl: imageUrl,
        prompt: prompt
      };
    } else {
      return {
        success: false,
        error: 'No image URL returned from API'
      };
    }
  } catch (error) {
    console.error('Error generating avatar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 生成AI角色头像并上传到IPFS
 */
export async function generateAndUploadAIAvatar(options: AvatarGenerationOptions): Promise<AvatarGenerationResult> {
  try {
    // 1. 生成头像
    console.log('Step 1: Generating AI avatar...');
    const avatarResult = await generateAIAvatar(options);

    if (!avatarResult.success || !avatarResult.imageUrl) {
      return avatarResult;
    }

    // 2. 上传到IPFS
    console.log('Step 2: Uploading to IPFS...');
    const filename = `ai-avatar-${options.personalityType}-${Date.now()}.png`;
    const ipfsResult = await uploadImageToIPFS(avatarResult.imageUrl, filename);

    if (!ipfsResult.success) {
      // 如果IPFS上传失败，仍然返回原始图片URL
      console.warn('IPFS upload failed, using original URL:', ipfsResult.error);
      return {
        ...avatarResult,
        error: `Avatar generated but IPFS upload failed: ${ipfsResult.error}`
      };
    }

    // 3. 返回完整结果
    return {
      success: true,
      imageUrl: avatarResult.imageUrl, // 原始URL（临时）
      ipfsHash: ipfsResult.ipfsHash,
      ipfsUrl: ipfsResult.ipfsUrl, // IPFS永久URL
      prompt: avatarResult.prompt
    };

  } catch (error) {
    console.error('Error in generateAndUploadAIAvatar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 构建头像生成提示词
 */
function buildPrompt(options: AvatarGenerationOptions, style: typeof AVATAR_STYLES[keyof typeof AVATAR_STYLES]): string {
  const { gender = 'neutral', artStyle = 'realistic', customPrompt } = options;
  
  // 如果有自定义提示词，优先使用
  if (customPrompt) {
    return `${customPrompt}, ${style.style}, high quality, detailed, professional`;
  }
  
  // 性别描述
  const genderDesc = gender === 'neutral' ? 'person' : gender === 'male' ? 'man' : 'woman';
  
  // 艺术风格描述
  const artStyleDesc = {
    'realistic': 'photorealistic, detailed, high resolution',
    'anime': 'anime style, manga art, Japanese animation',
    'cartoon': 'cartoon style, colorful, stylized',
    'cyberpunk': 'cyberpunk style, neon lights, futuristic'
  }[artStyle];
  
  return `${artStyleDesc}, portrait of a ${genderDesc} as ${style.description}, ${style.mood}, ${style.style}, high quality, detailed, professional, centered composition, clean background`;
}

/**
 * 获取预设的头像样式选项
 */
export function getAvatarStyleOptions() {
  return Object.keys(AVATAR_STYLES).map(key => ({
    value: key,
    label: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    description: AVATAR_STYLES[key as keyof typeof AVATAR_STYLES].description
  }));
}

/**
 * 验证生成的图片URL是否有效
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}
