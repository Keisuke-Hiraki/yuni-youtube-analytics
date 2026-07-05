import { NextRequest, NextResponse } from 'next/server'
import { cleanupIndex } from '@/lib/vector-db'
import { debugLog, debugError } from '@/lib/utils'
import { requireAdminAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // 管理者認証
    const authError = requireAdminAuth(request)
    if (authError) {
      return authError
    }

    debugLog('インデックスクリーンアップ開始')
    
    // データクリーンアップを実行
    await cleanupIndex()
    
    debugLog('インデックスクリーンアップ完了')
    
    return NextResponse.json({
      success: true,
      message: 'インデックスのクリーンアップが完了しました',
      nextSteps: [
        'npm run index-videos を実行してデータを再インデックスしてください',
        '再インデックス後、検証APIでデータ品質を確認してください'
      ],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    debugError('インデックスクリーンアップエラー:', error)
    
    return NextResponse.json(
      { error: 'インデックスのクリーンアップに失敗しました' },
      { status: 500 }
    )
  }
} 