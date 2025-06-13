import { Index } from '@upstash/vector'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { YouTubeVideo } from './youtube'
import { debugLog, debugError } from './utils'

// Upstash Vector DBクライアントの初期化
let vectorIndex: Index | null = null

try {
  if (process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN) {
    vectorIndex = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    })
  }
} catch (error) {
  debugError('Vector DB初期化エラー:', error)
}

// Google Gemini APIクライアントの初期化
let genAI: GoogleGenerativeAI | null = null

try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }
} catch (error) {
  debugError('Gemini API初期化エラー:', error)
}

// タイムスタンプ管理用の特別なID
const TIMESTAMP_ID = '__last_update_timestamp__'
const UPDATE_INTERVAL_HOURS = 1

// 動画データをベクトル化するためのテキスト生成（修正版）
function createVideoText(video: YouTubeVideo): string {
  const publishYear = new Date(video.publishedAt).getFullYear()
  const publishMonth = new Date(video.publishedAt).getMonth() + 1
  const publishDate = new Date(video.publishedAt).toISOString().split('T')[0]
  
  // 数値データを分離して、テキスト検索用の内容のみを含める
  return `タイトル: ${video.title}
説明: ${video.description}
公開日: ${publishDate}
公開年: ${publishYear}年
公開月: ${publishMonth}月
再生時間: ${video.duration}
コンテンツタイプ: ${video.isLiveContent ? 'ライブ配信' : video.isShort ? 'ショート動画' : '通常動画'}
カテゴリ: ${video.isLiveContent ? 'ライブ' : video.isShort ? 'ショート' : '動画'}`
}

// 統計用の専用テキスト生成関数を追加
function createVideoTextForStats(video: YouTubeVideo): string {
  const baseText = createVideoText(video)
  // 統計的質問用に数値情報も含める（ただし明確に分離）
  return `${baseText}
統計情報: 視聴回数${Math.floor(video.viewCount / 1000)}千回 いいね数${Math.floor(video.likeCount / 1000)}千 コメント数${Math.floor(video.commentCount / 100)}百`
}

// Gemini APIを使用してテキストの埋め込みを生成
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI?.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model?.embedContent(text)
    return result?.embedding.values || []
  } catch (error) {
    debugError('Gemini API埋め込み生成エラー:', error)
    throw new Error(`埋め込み生成に失敗しました: ${error}`)
  }
}

// 最後の更新時刻を確認
async function getLastUpdateTime(): Promise<Date | null> {
  try {
    const result = await vectorIndex?.fetch([TIMESTAMP_ID])
    if (result && result.length > 0 && result[0]?.metadata) {
      const timestamp = result[0].metadata.timestamp as string
      return new Date(timestamp)
    }
    return null
  } catch (error) {
    debugLog('タイムスタンプ取得エラー（初回実行の可能性）:', error)
    return null
  }
}

// タイムスタンプを更新
async function updateTimestamp(): Promise<void> {
  try {
    const now = new Date()
    // ダミーの埋め込みベクトル（768次元）
    const dummyVector = new Array(768).fill(0)
    
    await vectorIndex?.upsert([{
      id: TIMESTAMP_ID,
      vector: dummyVector,
      metadata: {
        timestamp: now.toISOString(),
        type: 'timestamp'
      }
    }])
    
    debugLog('タイムスタンプ更新完了:', now.toISOString())
  } catch (error) {
    debugError('タイムスタンプ更新エラー:', error)
    throw error
  }
}

// 更新が必要かどうかを判定
async function shouldUpdate(): Promise<boolean> {
  // 強制更新フラグがある場合は常に更新
  if (process.env.FORCE_UPDATE === 'true') {
    debugLog('強制更新フラグが設定されているため更新を実行します')
    return true
  }
  
  const lastUpdate = await getLastUpdateTime()
  
  if (!lastUpdate) {
    debugLog('初回実行のため更新を実行します')
    return true
  }
  
  const now = new Date()
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
  
  debugLog('更新チェック:', {
    lastUpdate: lastUpdate.toISOString(),
    hoursSinceUpdate: hoursSinceUpdate.toFixed(2),
    shouldUpdate: hoursSinceUpdate >= UPDATE_INTERVAL_HOURS
  })
  
  return hoursSinceUpdate >= UPDATE_INTERVAL_HOURS
}

// 動画データをVector DBにインデックス（修正版）
export async function indexVideos(videos: YouTubeVideo[]): Promise<void> {
  try {
    if (!vectorIndex || !genAI) {
      debugLog('Vector DBまたはGemini APIが初期化されていないため、インデックスをスキップします')
      return
    }
    
    debugLog('Vector DB更新チェック開始')
    
    // 更新が必要かチェック
    if (!(await shouldUpdate())) {
      debugLog('更新間隔内のためスキップします')
      return
    }
    
    debugLog('Vector DBインデックス開始:', { videosCount: videos.length })
    
    // 既存のデータを完全に削除（改善版）
    try {
      // まず全ての動画IDを取得（通常版と統計版の両方）
      const allVideoIds = videos.flatMap(v => [v.id, `${v.id}_stats`])
      
      // バッチサイズで削除処理
      const deleteBatchSize = 100
      for (let i = 0; i < allVideoIds.length; i += deleteBatchSize) {
        const batch = allVideoIds.slice(i, i + deleteBatchSize)
        await vectorIndex?.delete(batch)
        debugLog(`削除バッチ ${Math.floor(i / deleteBatchSize) + 1} 完了: ${batch.length}件`)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      debugLog('既存データ削除完了')
    } catch (deleteError) {
      debugLog('既存データ削除エラー（初回実行の可能性）:', deleteError)
    }
    
    // バッチサイズを設定（APIの制限を考慮）
    const batchSize = 8 // より小さなバッチサイズで安定性向上
    const batches = []
    
    for (let i = 0; i < videos.length; i += batchSize) {
      batches.push(videos.slice(i, i + batchSize))
    }
    
    debugLog(`${batches.length}個のバッチで処理開始`)
    
    // 各バッチを処理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      debugLog(`バッチ ${batchIndex + 1}/${batches.length} 処理中...`)
      
      const vectors = []
      
      for (const video of batch) {
        try {
          // 通常検索用のテキスト
          const searchText = createVideoText(video)
          const searchEmbedding = await generateEmbedding(searchText)
          
          // 統計検索用のテキスト
          const statsText = createVideoTextForStats(video)
          const statsEmbedding = await generateEmbedding(statsText)
          
          // 通常検索用ベクトル
          vectors.push({
            id: video.id,
            vector: searchEmbedding,
            metadata: {
              title: video.title,
              description: video.description.substring(0, 500),
              publishedAt: video.publishedAt,
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              duration: video.duration,
              isLiveContent: video.isLiveContent,
              isShort: video.isShort,
              publishYear: new Date(video.publishedAt).getFullYear(),
              publishMonth: new Date(video.publishedAt).getMonth() + 1,
              type: 'video',
              searchType: 'general'
            }
          })
          
          // 統計検索用ベクトル（別ID）
          vectors.push({
            id: `${video.id}_stats`,
            vector: statsEmbedding,
            metadata: {
              title: video.title,
              description: video.description.substring(0, 500),
              publishedAt: video.publishedAt,
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              duration: video.duration,
              isLiveContent: video.isLiveContent,
              isShort: video.isShort,
              publishYear: new Date(video.publishedAt).getFullYear(),
              publishMonth: new Date(video.publishedAt).getMonth() + 1,
              type: 'video',
              searchType: 'statistical',
              originalId: video.id
            }
          })
          
          // API制限を考慮して待機
          await new Promise(resolve => setTimeout(resolve, 150))
        } catch (error) {
          debugError(`動画 ${video.id} の処理エラー:`, error)
          // エラーが発生した動画はスキップして続行
        }
      }
      
      if (vectors.length > 0) {
        await vectorIndex?.upsert(vectors)
        debugLog(`バッチ ${batchIndex + 1} 完了: ${vectors.length}件`)
      }
      
      // バッチ間で待機
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    // タイムスタンプを更新
    await updateTimestamp()
    
    debugLog('Vector DBインデックス完了')
  } catch (error) {
    debugError('Vector DBインデックスエラー:', error)
    throw error
  }
}

// ベクトル検索を実行（修正版）
export async function searchVideos(query: string, topK: number = 20): Promise<YouTubeVideo[]> {
  try {
    if (!vectorIndex || !genAI) {
      debugLog('Vector DBまたはGemini APIが初期化されていないため、空の結果を返します')
      return []
    }
    
    debugLog('ベクトル検索開始:', { query: query.substring(0, 100), topK })
    
    // クエリの埋め込みを生成
    const queryEmbedding = await generateEmbedding(query)
    
    // 一般検索用ベクトルのみを対象に検索
    const results = await vectorIndex?.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: `type = 'video' AND searchType = 'general'`
    })
    
    debugLog('検索結果:', { resultsCount: results?.length || 0 })
    
    // 結果をYouTubeVideo形式に変換（型安全性向上）
    const videos: YouTubeVideo[] = results
      ?.filter((result: any) => {
        return result.metadata && 
               result.score && 
               result.score > 0.7 &&
               typeof result.metadata.viewCount === 'number' &&
               typeof result.metadata.likeCount === 'number'
      })
      .map((result: any) => {
        const metadata = result.metadata!
        return {
          id: result.id,
          title: String(metadata.title || ''),
          description: String(metadata.description || ''),
          publishedAt: String(metadata.publishedAt || ''),
          thumbnailUrl: `https://img.youtube.com/vi/${result.id}/maxresdefault.jpg`,
          viewCount: Number(metadata.viewCount) || 0,
          likeCount: Number(metadata.likeCount) || 0,
          commentCount: Number(metadata.commentCount) || 0,
          duration: String(metadata.duration || ''),
          isLiveContent: Boolean(metadata.isLiveContent),
          isShort: Boolean(metadata.isShort),
        }
      }) || []
    
    debugLog('変換完了:', { videosCount: videos.length })
    return videos
  } catch (error) {
    debugError('ベクトル検索エラー:', error)
    throw error
  }
}

// 統計的クエリ用の特別な検索（修正版）
export async function searchVideosForStats(query: string, year?: number): Promise<YouTubeVideo[]> {
  try {
    if (!vectorIndex || !genAI) {
      debugLog('Vector DBまたはGemini APIが初期化されていないため、空の結果を返します')
      return []
    }
    
    debugLog('統計検索開始:', { query: query.substring(0, 100), year })
    
    // 統計用クエリの埋め込みを生成
    const statsQuery = `統計 ランキング 人気 ${query}`
    const queryEmbedding = await generateEmbedding(statsQuery)
    
    // 統計検索用ベクトルを対象に検索
    const filterCondition = year 
      ? `type = 'video' AND searchType = 'statistical' AND publishYear = ${year}`
      : `type = 'video' AND searchType = 'statistical'`
    
    const results = await vectorIndex?.query({
      vector: queryEmbedding,
      topK: 100, // 統計用により多くのデータを取得
      includeMetadata: true,
      filter: filterCondition
    })
    
    debugLog('統計検索結果:', { resultsCount: results?.length || 0 })
    
    // 結果をYouTubeVideo形式に変換（重複除去）
    const videoMap = new Map<string, YouTubeVideo>()
    
    results
      ?.filter((result: any) => {
        return result.metadata && 
               result.score && 
               result.score > 0.5 &&
               typeof result.metadata.viewCount === 'number' &&
               typeof result.metadata.likeCount === 'number'
      })
      .forEach((result: any) => {
        const metadata = result.metadata!
        const originalId = metadata.originalId || result.id.replace('_stats', '')
        
        if (!videoMap.has(originalId)) {
          videoMap.set(originalId, {
            id: originalId,
            title: String(metadata.title || ''),
            description: String(metadata.description || ''),
            publishedAt: String(metadata.publishedAt || ''),
            thumbnailUrl: `https://img.youtube.com/vi/${originalId}/maxresdefault.jpg`,
            viewCount: Number(metadata.viewCount) || 0,
            likeCount: Number(metadata.likeCount) || 0,
            commentCount: Number(metadata.commentCount) || 0,
            duration: String(metadata.duration || ''),
            isLiveContent: Boolean(metadata.isLiveContent),
            isShort: Boolean(metadata.isShort),
          })
        }
      })
    
    const videos = Array.from(videoMap.values())
    debugLog('統計検索変換完了:', { videosCount: videos.length })
    return videos
  } catch (error) {
    debugError('統計検索エラー:', error)
    throw error
  }
}

// データ整合性チェック機能
export async function validateIndexData(): Promise<{
  isValid: boolean
  issues: string[]
  recommendations: string[]
}> {
  const issues: string[] = []
  const recommendations: string[] = []
  
  try {
    if (!vectorIndex) {
      issues.push('Vector DBが初期化されていません')
      return { isValid: false, issues, recommendations }
    }
    
    // インデックス統計を取得
    const stats = await vectorIndex.info()
    debugLog('インデックス統計:', stats)
    
    // 基本的な検証
    if (stats.vectorCount === 0) {
      issues.push('インデックスにデータが存在しません')
      recommendations.push('npm run index-videos を実行してデータをインデックスしてください')
    }
    
    // サンプル検索でデータ品質をチェック
    const testResults = await vectorIndex.query({
      vector: new Array(768).fill(0.1),
      topK: 5,
      includeMetadata: true,
      filter: `type = 'video'`
    })
    
    if (testResults && testResults.length > 0) {
      for (const result of testResults) {
        if (!result.metadata) {
          issues.push('メタデータが欠落している項目があります')
          break
        }
        
        const metadata = result.metadata
        if (typeof metadata.viewCount !== 'number' || metadata.viewCount < 0) {
          issues.push('再生回数データに異常があります')
          recommendations.push('データを再インデックスしてください')
          break
        }
        
        if (typeof metadata.likeCount !== 'number' || metadata.likeCount < 0) {
          issues.push('いいね数データに異常があります')
          recommendations.push('データを再インデックスしてください')
          break
        }
      }
    }
    
    const isValid = issues.length === 0
    return { isValid, issues, recommendations }
    
  } catch (error) {
    debugError('データ検証エラー:', error)
    issues.push(`検証中にエラーが発生しました: ${error}`)
    return { isValid: false, issues, recommendations }
  }
}

// 完全なデータクリーンアップ機能
export async function cleanupIndex(): Promise<void> {
  try {
    if (!vectorIndex) {
      throw new Error('Vector DBが初期化されていません')
    }
    
    debugLog('インデックスクリーンアップ開始')
    
    // 全データを削除（タイムスタンプ以外）
    const stats = await vectorIndex.info()
    debugLog('削除前の統計:', stats)
    
    // 範囲削除を試行
    await vectorIndex.reset()
    debugLog('インデックスリセット完了')
    
    // タイムスタンプを削除して強制更新を促す
    try {
      await vectorIndex.delete([TIMESTAMP_ID])
    } catch (error) {
      debugLog('タイムスタンプ削除エラー（問題なし）:', error)
    }
    
    debugLog('インデックスクリーンアップ完了')
  } catch (error) {
    debugError('クリーンアップエラー:', error)
    throw error
  }
}

// インデックス状態を確認
export async function getIndexStatus(): Promise<{
  lastUpdate: Date | null
  shouldUpdate: boolean
  totalVectors: number
}> {
  try {
    const lastUpdate = await getLastUpdateTime()
    const shouldUpdateFlag = await shouldUpdate()
    
    // ベクトル数を取得（概算）
    const stats = await vectorIndex?.info()
    
    return {
      lastUpdate,
      shouldUpdate: shouldUpdateFlag,
      totalVectors: stats?.vectorCount || 0
    }
  } catch (error) {
    debugError('インデックス状態確認エラー:', error)
    return {
      lastUpdate: null,
      shouldUpdate: true,
      totalVectors: 0
    }
  }
}