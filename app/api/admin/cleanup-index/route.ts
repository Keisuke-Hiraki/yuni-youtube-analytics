import { NextRequest, NextResponse } from 'next/server'
import { cleanupIndex } from '@/lib/vector-db'
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
      { 
        error: 'インデックスのクリーンアップに失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 