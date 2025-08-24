import { NextRequest, NextResponse } from 'next/server';
import initPerformanceData from '@/scripts/init-performance-data';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 开始初始化AI性能数据...');
    
    await initPerformanceData();
    
    return NextResponse.json({
      success: true,
      message: 'AI性能数据初始化成功'
    });
    
  } catch (error: any) {
    console.error('❌ 初始化AI性能数据失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || '初始化失败'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '使用POST方法来初始化AI性能数据',
    endpoint: '/api/init-performance',
    method: 'POST'
  });
}