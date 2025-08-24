import { NextRequest, NextResponse } from 'next/server';
import PerformanceTrackingService from '@/services/performanceTrackingService';
import { TimeFrame } from '@/types/performance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as TimeFrame) || TimeFrame.WEEK;
    
    console.log('🏆 API: 获取排行榜数据，时间框架:', timeframe);
    
    // 获取排行榜数据和概览
    const [leaderboard, overview] = await Promise.all([
      PerformanceTrackingService.getLeaderboard(timeframe),
      PerformanceTrackingService.getPerformanceOverview(timeframe)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        overview
      }
    });
    
  } catch (error: any) {
    console.error('❌ API: 获取排行榜数据失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch leaderboard data',
      data: {
        leaderboard: [],
        overview: {
          avg_win_rate: 0,
          avg_performance: 0,
          total_volume: 0,
          active_ais: 0
        }
      }
    }, { status: 500 });
  }
}