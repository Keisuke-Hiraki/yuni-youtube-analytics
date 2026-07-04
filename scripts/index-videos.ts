#!/usr/bin/env tsx

import { indexVideos, getIndexStatus } from '../lib/vector-db'
import { getChannelVideos } from '../lib/youtube'
import { debugLog, debugError } from '../lib/utils'

// YuNiのチャンネルID
const YUNI_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID!

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
    
    // 動画データを取得（取得失敗時はgetChannelVideosが例外をthrowする）
    console.log('📹 動画データを取得中...')
    const videos = await getChannelVideos(YUNI_CHANNEL_ID, 500) // 最大500件

    if (videos.length === 0) {
      console.error('❌ 動画データが0件です。処理を中断します。')
      process.exit(1)
    }
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
    
    // 詳細統計を表示（videos.length は上でチェック済みのため0除算にならない）
    if (updatedStatus.totalVectors > 0) {
      console.log('\n📈 インデックス詳細:')
      console.log(`  - 総ベクトル数: ${updatedStatus.totalVectors}`)
      console.log(`  - 推定動画数: ${Math.floor(updatedStatus.totalVectors / 2)} (通常版 + 統計版)`)
      console.log(`  - 処理済み動画: ${videos.length}`)
      console.log(`  - 成功率: ${Math.round((updatedStatus.totalVectors / (videos.length * 2)) * 100)}%`)
    }
    
    console.log('\n🎉 すべての処理が完了しました！')
    console.log('\n💡 次のステップ:')
    console.log('  - npm run validate-index でデータ検証を実行できます')
    console.log('  - チャットボット機能でRAG検索をテストしてください')
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