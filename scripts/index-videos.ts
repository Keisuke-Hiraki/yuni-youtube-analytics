#!/usr/bin/env tsx

import { indexVideos, getIndexStatus } from '../lib/vector-db'
import { getChannelVideos } from '../lib/youtube'
import { debugLog, debugError } from '../lib/utils'

// YuNiのチャンネルID
const YUNI_CHANNEL_ID = 'UCYbOutLY_XGz4XjTdPKpxhA'

async function main() {
  try {
    console.log('🚀 動画インデックス処理を開始します...')
    
    // 現在のインデックス状態を確認
    console.log('📊 現在のインデックス状態を確認中...')
    const status = await getIndexStatus()
    console.log('インデックス状態:', {
      lastUpdate: status.lastUpdate?.toISOString() || '未実行',
      shouldUpdate: status.shouldUpdate,
      totalVectors: status.totalVectors
    })
    
    // 動画データを取得
    console.log('📹 動画データを取得中...')
    const videos = await getChannelVideos(YUNI_CHANNEL_ID, 500) // 最大500件
    console.log(`✅ ${videos.length}件の動画データを取得しました`)
    
    // 強制更新フラグを設定
    process.env.FORCE_UPDATE = 'true'
    
    // インデックス処理を実行
    console.log('🔄 Vector DBにインデックス中...')
    await indexVideos(videos)
    console.log('✅ インデックス処理が完了しました')
    
    // 更新後の状態を確認
    console.log('📊 更新後のインデックス状態を確認中...')
    const updatedStatus = await getIndexStatus()
    console.log('更新後のインデックス状態:', {
      lastUpdate: updatedStatus.lastUpdate?.toISOString() || '未実行',
      shouldUpdate: updatedStatus.shouldUpdate,
      totalVectors: updatedStatus.totalVectors
    })
    
    console.log('🎉 すべての処理が完了しました！')
  } catch (error) {
    debugError('インデックス処理エラー:', error)
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main()
} 