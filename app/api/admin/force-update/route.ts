import { NextRequest, NextResponse } from 'next/server'
import { indexVideos } from '@/lib/vector-db'
import { fetchYuNiVideos } from '@/app/actions'
import { debugLog, debugError } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // 管理者認証
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY
    
    if (!adminKey || !authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    if (token !== adminKey) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 403 }
      )
    }
    
    debugLog('強制インデックス更新開始')
    
    // 動画データを取得
    const { videos, error: videoError } = await fetchYuNiVideos()
    
    if (videoError) {
      debugError('動画データ取得エラー:', videoError)
      return NextResponse.json(
        { error: `動画データの取得に失敗しました: ${videoError}` },
        { status: 500 }
      )
    }
    
    // タイムスタンプチェックを無視して強制的にインデックス更新
    // 一時的にタイムスタンプを古い日付に設定
    const originalEnv = process.env.FORCE_UPDATE
    process.env.FORCE_UPDATE = 'true'
    
    try {
      await indexVideos(videos)
      debugLog('強制インデックス更新完了')
      
      return NextResponse.json({
        success: true,
        message: 'インデックスの強制更新が完了しました',
        videosProcessed: videos.length,
        timestamp: new Date().toISOString()
      })
    } finally {
      // 環境変数を元に戻す
      if (originalEnv !== undefined) {
        process.env.FORCE_UPDATE = originalEnv
      } else {
        delete process.env.FORCE_UPDATE
      }
    }
  } catch (error) {
    debugError('強制インデックス更新エラー:', error)
    
    return NextResponse.json(
      { 
        error: 'インデックスの強制更新に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 