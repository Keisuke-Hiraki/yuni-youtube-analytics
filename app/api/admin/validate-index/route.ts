import { NextRequest, NextResponse } from 'next/server'
import { validateIndexData, getIndexStatus } from '@/lib/vector-db'
import { debugLog, debugError } from '@/lib/utils'

export async function GET(request: NextRequest) {
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
    
    debugLog('インデックス検証開始')
    
    // インデックス状態を取得
    const status = await getIndexStatus()
    
    // データ検証を実行
    const validation = await validateIndexData()
    
    debugLog('インデックス検証完了:', {
      isValid: validation.isValid,
      issuesCount: validation.issues.length,
      totalVectors: status.totalVectors
    })
    
    return NextResponse.json({
      success: true,
      status: {
        lastUpdate: status.lastUpdate?.toISOString() || null,
        shouldUpdate: status.shouldUpdate,
        totalVectors: status.totalVectors,
        estimatedVideos: Math.floor(status.totalVectors / 2)
      },
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        recommendations: validation.recommendations
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    debugError('インデックス検証エラー:', error)
    
    return NextResponse.json(
      { 
        error: 'インデックス検証に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 