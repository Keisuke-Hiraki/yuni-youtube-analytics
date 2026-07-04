import { NextRequest, NextResponse } from 'next/server'
import { getIndexStatus } from '@/lib/vector-db'
import { debugLog, debugError } from '@/lib/utils'
import { requireAdminAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // 管理者認証
    const authError = requireAdminAuth(request)
    if (authError) {
      return authError
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
      { error: 'インデックス状態の確認に失敗しました' },
      { status: 500 }
    )
  }
} 