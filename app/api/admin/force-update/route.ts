import { NextRequest, NextResponse } from 'next/server'
import { indexVideos } from '@/lib/vector-db'
import { fetchYuNiVideos } from '@/app/actions'
import { debugLog, debugError } from '@/lib/utils'
import { requireAdminAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // 管理者認証
    const authError = requireAdminAuth(request)
    if (authError) {
      return authError
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
    await indexVideos(videos, { force: true })
    debugLog('強制インデックス更新完了')

    return NextResponse.json({
      success: true,
      message: 'インデックスの強制更新が完了しました',
      videosProcessed: videos.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    debugError('強制インデックス更新エラー:', error)

    return NextResponse.json(
      { error: 'インデックスの強制更新に失敗しました' },
      { status: 500 }
    )
  }
} 