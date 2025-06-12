import { NextRequest, NextResponse } from 'next/server'
import { getIndexStatus } from '@/lib/vector-db'
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
    
    debugLog('インデックス状態確認開始')
    
    // インデックス状態を取得
    const status = await getIndexStatus()
    
    debugLog('インデックス状態確認完了:', status)
    
    return NextResponse.json({
      success: true,
      status: {
        lastUpdate: status.lastUpdate?.toISOString() || null,
        shouldUpdate: status.shouldUpdate,
        totalVectors: status.totalVectors,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    debugError('インデックス状態確認エラー:', error)
    
    return NextResponse.json(
      { 
        error: 'インデックス状態の確認に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 