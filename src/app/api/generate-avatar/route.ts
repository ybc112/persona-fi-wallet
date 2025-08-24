import { NextRequest, NextResponse } from 'next/server';
import { generateAndUploadAIAvatar, type AvatarGenerationOptions } from '@/services/aiAvatarService';

export interface GenerateAvatarRequest {
  personalityType: string;
  customPrompt?: string;
  gender?: 'male' | 'female' | 'neutral';
  artStyle?: 'realistic' | 'anime' | 'cartoon' | 'cyberpunk';
}

export interface GenerateAvatarResponse {
  success: boolean;
  imageUrl?: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
  prompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { personalityType, customPrompt, gender, artStyle }: GenerateAvatarRequest = await request.json();

    console.log('🎨 接收到头像生成请求:', {
      personalityType,
      customPrompt: customPrompt ? '已提供' : '未提供',
      gender,
      artStyle
    });

    // 验证必需参数
    if (!personalityType) {
      return NextResponse.json({
        success: false,
        error: 'personalityType is required'
      }, { status: 400 });
    }

    // 验证personalityType是否有效
    const validPersonalityTypes = [
      'aggressive-trader',
      'conservative-advisor', 
      'defi-expert',
      'meme-hunter',
      'nft-specialist',
      'gamefi-pro'
    ];

    if (!validPersonalityTypes.includes(personalityType)) {
      return NextResponse.json({
        success: false,
        error: `Invalid personalityType. Must be one of: ${validPersonalityTypes.join(', ')}`
      }, { status: 400 });
    }

    // 构建生成选项
    const options: AvatarGenerationOptions = {
      personalityType: personalityType as any,
      customPrompt,
      gender: gender || 'neutral',
      artStyle: artStyle || 'realistic'
    };

    console.log('🚀 开始生成AI头像...');

    // 生成头像并上传到IPFS
    const result = await generateAndUploadAIAvatar(options);

    console.log('✅ 头像生成完成:', {
      success: result.success,
      hasImageUrl: !!result.imageUrl,
      hasIpfsUrl: !!result.ipfsUrl,
      error: result.error
    });

    // 返回结果
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ 头像生成API错误:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
