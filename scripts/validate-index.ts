#!/usr/bin/env tsx

import { validateIndexData, getIndexStatus, cleanupIndex } from '../lib/vector-db'
import { debugLog, debugError } from '../lib/utils'
import * as readline from 'readline'

// コンソール入力用のインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// ユーザー入力を待つ関数
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase())
    })
  })
}

async function main() {
  try {
    console.log('🔍 Vector DBデータ検証を開始します...')
    
    // インデックス状態を確認
    console.log('📊 現在のインデックス状態を確認中...')
    const status = await getIndexStatus()
    console.log('インデックス状態:', {
      lastUpdate: status.lastUpdate?.toISOString() || '未実行',
      shouldUpdate: status.shouldUpdate,
      totalVectors: status.totalVectors
    })
    
    // データ検証を実行
    console.log('\n🔍 データ検証を実行中...')
    const validation = await validateIndexData()
    
    if (validation.isValid) {
      console.log('✅ データ検証完了: 問題は見つかりませんでした')
      console.log(`📊 総ベクトル数: ${status.totalVectors}`)
      
      if (status.totalVectors > 0) {
        console.log('💡 データは正常に動作しているようです。')
      }
    } else {
      console.log('❌ データに問題が見つかりました:')
      validation.issues.forEach(issue => console.log(`  - ${issue}`))
      
      if (validation.recommendations.length > 0) {
        console.log('\n💡 推奨対応:')
        validation.recommendations.forEach(rec => console.log(`  - ${rec}`))
      }
      
      // クリーンアップを提案
      console.log('\n🧹 データをクリーンアップして再インデックスしますか？')
      console.log('   これにより既存のVector DBデータが全て削除されます。')
      const answer = await askQuestion('続行しますか？ (y/N): ')
      
      if (answer === 'y' || answer === 'yes') {
        console.log('\n🧹 データクリーンアップを開始します...')
        await cleanupIndex()
        console.log('✅ クリーンアップ完了')
        
        console.log('\n📝 次のステップ:')
        console.log('  1. npm run index-videos を実行してデータを再インデックスしてください')
        console.log('  2. 再インデックス後、このスクリプトを再実行して検証してください')
      } else {
        console.log('❌ クリーンアップをキャンセルしました')
      }
    }
    
    // 詳細統計を表示
    if (status.totalVectors > 0) {
      console.log('\n📈 詳細統計:')
      console.log(`  - 総ベクトル数: ${status.totalVectors}`)
      console.log(`  - 推定動画数: ${Math.floor(status.totalVectors / 2)} (通常版 + 統計版)`)
      console.log(`  - 最終更新: ${status.lastUpdate?.toISOString() || '不明'}`)
      console.log(`  - 更新必要: ${status.shouldUpdate ? 'はい' : 'いいえ'}`)
    }
    
  } catch (error) {
    debugError('検証エラー:', error)
    console.error('❌ 検証中にエラーが発生しました:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// 直接実行された場合のみmain関数を呼び出し
if (require.main === module) {
  main()
} 