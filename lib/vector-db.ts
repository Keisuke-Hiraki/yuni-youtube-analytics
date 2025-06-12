import { Index } from '@upstash/vector'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { YouTubeVideo } from './youtube'
import { debugLog, debugError } from './utils'

// Upstash Vector DBクライアントの初期化
const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
})

// Google Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// タイムスタンプ管理用の特別なID
const TIMESTAMP_ID = '__last_update_timestamp__'
const UPDATE_INTERVAL_HOURS = 1

// 動画データをベクトル化するためのテキスト生成
function createVideoText(video: YouTubeVideo): string {
  const publishYear = new Date(video.publishedAt).getFullYear()
  const publishMonth = new Date(video.publishedAt).getMonth() + 1
  const publishDate = new Date(video.publishedAt).toISOString().split('T')[0]
  
  return `タイトル: ${video.title}
説明: ${video.description}
公開日: ${publishDate}
公開年: ${publishYear}
公開月: ${publishMonth}
視聴回数: ${video.viewCount}
いいね数: ${video.likeCount}
コメント数: ${video.commentCount}
再生時間: ${video.duration}
ライブ配信: ${video.isLiveContent ? 'はい' : 'いいえ'}
ショート動画: ${video.isShort ? 'はい' : 'いいえ'}
URL: https://www.youtube.com/watch?v=${video.id}`
}

// Gemini APIを使用してテキストの埋め込みを生成
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (error) {
    debugError('Gemini API埋め込み生成エラー:', error)
    throw new Error(`埋め込み生成に失敗しました: ${error}`)
  }
}

// 最後の更新時刻を確認
async function getLastUpdateTime(): Promise<Date | null> {
  try {
    const result = await vectorIndex.fetch([TIMESTAMP_ID])
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
    
    await vectorIndex.upsert([{
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

// 動画データをVector DBにインデックス
export async function indexVideos(videos: YouTubeVideo[]): Promise<void> {
  try {
    debugLog('Vector DB更新チェック開始')
    
    // 更新が必要かチェック
    if (!(await shouldUpdate())) {
      debugLog('更新間隔内のためスキップします')
      return
    }
    
    debugLog('Vector DBインデックス開始:', { videosCount: videos.length })
    
    // 既存のデータを削除（タイムスタンプ以外）
    try {
      // 全てのベクトルIDを取得して削除
      const existingIds = videos.map(v => v.id)
      if (existingIds.length > 0) {
        await vectorIndex.delete(existingIds)
        debugLog('既存データ削除完了')
      }
    } catch (deleteError) {
      debugLog('既存データ削除エラー（初回実行の可能性）:', deleteError)
    }
    
    // バッチサイズを設定（APIの制限を考慮）
    const batchSize = 10
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
          const text = createVideoText(video)
          const embedding = await generateEmbedding(text)
          
          vectors.push({
            id: video.id,
            vector: embedding,
            metadata: {
              title: video.title,
              description: video.description.substring(0, 500), // 長すぎる説明を切り詰め
              publishedAt: video.publishedAt,
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              duration: video.duration,
              isLiveContent: video.isLiveContent,
              isShort: video.isShort,
              publishYear: new Date(video.publishedAt).getFullYear(),
              publishMonth: new Date(video.publishedAt).getMonth() + 1,
              type: 'video'
            }
          })
          
          // API制限を考慮して少し待機
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          debugError(`動画 ${video.id} の処理エラー:`, error)
          // エラーが発生した動画はスキップして続行
        }
      }
      
      if (vectors.length > 0) {
        await vectorIndex.upsert(vectors)
        debugLog(`バッチ ${batchIndex + 1} 完了: ${vectors.length}件`)
      }
      
      // バッチ間で少し待機
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // タイムスタンプを更新
    await updateTimestamp()
    
    debugLog('Vector DBインデックス完了')
  } catch (error) {
    debugError('Vector DBインデックスエラー:', error)
    throw error
  }
}

// ベクトル検索を実行
export async function searchVideos(query: string, topK: number = 20): Promise<YouTubeVideo[]> {
  try {
    debugLog('ベクトル検索開始:', { query: query.substring(0, 100), topK })
    
    // クエリの埋め込みを生成
    const queryEmbedding = await generateEmbedding(query)
    
    // ベクトル検索を実行
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: `type = 'video'`
    })
    
    debugLog('検索結果:', { resultsCount: results.length })
    
    // 結果をYouTubeVideo形式に変換
    const videos: YouTubeVideo[] = results
      .filter((result: any) => result.metadata && result.score && result.score > 0.7) // 類似度フィルタ
      .map((result: any) => ({
        id: result.id,
        title: result.metadata!.title as string,
        description: result.metadata!.description as string,
        publishedAt: result.metadata!.publishedAt as string,
        thumbnailUrl: `https://img.youtube.com/vi/${result.id}/maxresdefault.jpg`,
        viewCount: result.metadata!.viewCount as number,
        likeCount: result.metadata!.likeCount as number,
        commentCount: result.metadata!.commentCount as number,
        duration: result.metadata!.duration as string,
        isLiveContent: result.metadata!.isLiveContent as boolean,
        isShort: result.metadata!.isShort as boolean,
      }))
    
    debugLog('変換完了:', { videosCount: videos.length })
    return videos
  } catch (error) {
    debugError('ベクトル検索エラー:', error)
    throw error
  }
}

// 統計的クエリ用の特別な検索
export async function searchVideosForStats(query: string, year?: number): Promise<YouTubeVideo[]> {
  try {
    debugLog('統計検索開始:', { query: query.substring(0, 100), year })
    
    // より多くの結果を取得して統計処理
    const queryEmbedding = await generateEmbedding(query)
    
    const results = await vectorIndex.query({
      vector: queryEmbedding,
      topK: 100, // 統計用により多くのデータを取得
      includeMetadata: true,
      filter: year ? `type = 'video' AND publishYear = ${year}` : `type = 'video'`
    })
    
    debugLog('統計検索結果:', { resultsCount: results.length })
    
    // 結果をYouTubeVideo形式に変換
    const videos: YouTubeVideo[] = results
      .filter((result: any) => result.metadata && result.score && result.score > 0.5) // 統計用は閾値を下げる
      .map((result: any) => ({
        id: result.id,
        title: result.metadata!.title as string,
        description: result.metadata!.description as string,
        publishedAt: result.metadata!.publishedAt as string,
        thumbnailUrl: `https://img.youtube.com/vi/${result.id}/maxresdefault.jpg`,
        viewCount: result.metadata!.viewCount as number,
        likeCount: result.metadata!.likeCount as number,
        commentCount: result.metadata!.commentCount as number,
        duration: result.metadata!.duration as string,
        isLiveContent: result.metadata!.isLiveContent as boolean,
        isShort: result.metadata!.isShort as boolean,
      }))
    
    return videos
  } catch (error) {
    debugError('統計検索エラー:', error)
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
    const stats = await vectorIndex.info()
    
    return {
      lastUpdate,
      shouldUpdate: shouldUpdateFlag,
      totalVectors: stats.vectorCount || 0
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