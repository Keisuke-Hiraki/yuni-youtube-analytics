import Groq from 'groq-sdk'
import { YouTubeVideo } from './youtube'
import { debugLog, debugError } from '@/lib/utils'
import { indexVideos, searchVideos, searchVideosForStats } from './vector-db'

// チャットメッセージの型定義
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 質問タイプを判定する関数
function analyzeQueryType(message: string): 'statistical' | 'search' | 'recent' | 'general' {
  const lowerMessage = message.toLowerCase()
  
  // 統計的質問のパターン
  const statisticalPatterns = [
    /最も.*多い/, /最も.*少ない/, /一番.*人気/, /トップ/, /ランキング/,
    /何番目/, /順位/, /比較/, /統計/, /平均/, /合計/, /総/
  ]
  
  // 時系列質問のパターン  
  const temporalPatterns = [
    /\d{4}年/, /今年/, /去年/, /最近/, /最新/, /新しい/, /古い/,
    /月/, /週/, /日/, /期間/
  ]
  
  // 検索質問のパターン
  const searchPatterns = [
    /について/, /に関する/, /という/, /タイトル/, /歌/, /ゲーム/, /実況/
  ]
  
  if (statisticalPatterns.some(pattern => pattern.test(lowerMessage)) || 
      temporalPatterns.some(pattern => pattern.test(lowerMessage))) {
    return 'statistical'
  }
  
  if (temporalPatterns.some(pattern => pattern.test(lowerMessage))) {
    return 'recent'
  }
  
  if (searchPatterns.some(pattern => pattern.test(lowerMessage))) {
    return 'search'
  }
  
  return 'general'
}

// 年を抽出する関数
function extractYear(message: string): number | undefined {
  const yearMatch = message.match(/(\d{4})年?/)
  if (yearMatch) {
    const year = parseInt(yearMatch[1])
    if (year >= 2000 && year <= new Date().getFullYear()) {
      return year
    }
  }
  return undefined
}

// 動画データを圧縮形式で変換
function formatVideoCompact(video: YouTubeVideo): string {
  const date = video.publishedAt.split('T')[0]
  return `${video.title}|${video.viewCount}再生|${video.likeCount}いいね|${date}|https://youtu.be/${video.id}`
}

// 統計用の詳細フォーマット（必要最小限）
function formatVideoForStats(video: YouTubeVideo): string {
  return `${video.title}|再生:${video.viewCount}|いいね:${video.likeCount}|コメント:${video.commentCount}|日付:${video.publishedAt.split('T')[0]}`
}

// RAGを使用してデータを適切に選択・フォーマットする関数
async function prepareVideoDataWithRAG(videos: YouTubeVideo[], message: string) {
  const queryType = analyzeQueryType(message)
  
  // RAGシステムが利用可能かチェック
  const isRAGAvailable = process.env.GEMINI_API_KEY && 
                        process.env.UPSTASH_VECTOR_REST_URL && 
                        process.env.UPSTASH_VECTOR_REST_TOKEN
  
  if (!isRAGAvailable) {
    debugLog('RAG環境変数が設定されていないため、フォールバックを使用')
    return prepareVideoDataFallback(videos, message, queryType)
  }
  
  try {
    // まずVector DBにインデックス（必要に応じて）
    debugLog('Vector DB インデックス試行中...')
    await indexVideos(videos)
    debugLog('Vector DB インデックス完了')
    
    switch (queryType) {
      case 'statistical':
        // 統計的質問：RAGで関連動画を検索し、年でフィルタリング
        const year = extractYear(message)
        const statsVideos = await searchVideosForStats(message, year)
        
        if (statsVideos.length === 0) {
          // RAGで見つからない場合は従来の方法にフォールバック
          return prepareVideoDataFallback(videos, message, queryType)
        }
        
        // 統計処理用にソート
        const sortedVideos = [...statsVideos]
        if (message.includes('少ない') || message.includes('最小')) {
          sortedVideos.sort((a, b) => a.viewCount - b.viewCount)
        } else {
          sortedVideos.sort((a, b) => b.viewCount - a.viewCount)
        }
        
        const statsData = sortedVideos
          .slice(0, 50) // 上位50件に制限
          .map(formatVideoForStats)
          .join('\n')
        
        return {
          data: statsData,
          count: sortedVideos.length,
          type: 'statistical',
          source: 'rag'
        }
        
      case 'search':
        // 検索質問：RAGで意味的に関連する動画を検索
        const ragSearchVideos = await searchVideos(message, 30)
        
        if (ragSearchVideos.length === 0) {
          return prepareVideoDataFallback(videos, message, queryType)
        }
        
        return {
          data: ragSearchVideos.map(formatVideoCompact).join('\n'),
          count: ragSearchVideos.length,
          type: 'search',
          source: 'rag'
        }
        
      case 'recent':
        // 最新情報：RAGで検索してから日付順でソート
        const recentSearchVideos = await searchVideos(message, 50)
        const recentVideos = recentSearchVideos
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 30)
        
        if (recentVideos.length === 0) {
          return prepareVideoDataFallback(videos, message, queryType)
        }
        
        return {
          data: recentVideos.map(formatVideoCompact).join('\n'),
          count: recentVideos.length,
          type: 'recent',
          source: 'rag'
        }
        
      default:
        // 一般的質問：RAGで関連動画を検索
        const generalVideos = await searchVideos(message, 30)
        
        if (generalVideos.length === 0) {
          return prepareVideoDataFallback(videos, message, queryType)
        }
        
        return {
          data: generalVideos.map(formatVideoCompact).join('\n'),
          count: generalVideos.length,
          type: 'general',
          source: 'rag'
        }
    }
  } catch (error) {
    debugError('RAG検索エラー、フォールバックを使用:', error)
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      debugError('RAGエラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    
    debugLog('フォールバック処理を開始')
    return prepareVideoDataFallback(videos, message, queryType)
  }
}

// フォールバック用の従来の方法
function prepareVideoDataFallback(videos: YouTubeVideo[], message: string, queryType: string) {
  // videosが配列でない場合の安全性チェック
  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return {
      data: '動画データが利用できません。',
      count: 0,
      type: queryType,
      source: 'fallback'
    }
  }

  switch (queryType) {
    case 'statistical':
      // 統計的質問：データを年ごとにグループ化して要約
      const videosByYear = videos.reduce((acc, video) => {
        if (!video || !video.publishedAt) return acc
        const year = video.publishedAt.substring(0, 4)
        if (!acc[year]) acc[year] = []
        acc[year].push(video)
        return acc
      }, {} as Record<string, YouTubeVideo[]>)
      
      let statsData = ''
      Object.keys(videosByYear).sort().forEach(year => {
        const yearVideos = videosByYear[year]
        // 各年のトップ10のみ含める
        const topVideos = yearVideos
          .filter(video => video && video.viewCount !== undefined)
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 10)
        
        if (topVideos.length > 0) {
          statsData += `\n${year}年の動画:\n`
          statsData += topVideos.map(formatVideoForStats).join('\n')
        }
        statsData += '\n'
      })
      
      return {
        data: statsData,
        count: videos.length,
        type: 'statistical',
        source: 'fallback'
      }
      
    case 'search':
      // 検索質問：キーワードマッチング
      const keywords = message.toLowerCase().split(/\s+/).filter(word => word.length > 1)
      const relevantVideos = videos.filter(video => {
        if (!video || !video.title) return false
        const searchText = `${video.title} ${video.description || ''}`.toLowerCase()
        return keywords.some(keyword => searchText.includes(keyword))
      }).slice(0, 30)
      
      return {
        data: relevantVideos.length > 0 ? relevantVideos.map(formatVideoCompact).join('\n') : '検索条件に一致する動画が見つかりませんでした。',
        count: relevantVideos.length,
        type: 'search',
        source: 'fallback'
      }
      
    case 'recent':
      // 最新情報：日付順で最新50件
      const recentVideos = videos
        .filter(video => video && video.publishedAt)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 50)
      
      return {
        data: recentVideos.length > 0 ? recentVideos.map(formatVideoCompact).join('\n') : '最新の動画情報が見つかりませんでした。',
        count: recentVideos.length,
        type: 'recent',
        source: 'fallback'
      }
      
    default:
      // 一般的質問：人気順で上位30件
      const popularVideos = videos
        .filter(video => video && video.viewCount !== undefined)
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 30)
      
      return {
        data: popularVideos.length > 0 ? popularVideos.map(formatVideoCompact).join('\n') : '人気動画情報が見つかりませんでした。',
        count: popularVideos.length,
        type: 'general',
        source: 'fallback'
      }
  }
}

export async function generateChatResponse(
  message: string,
  videos: YouTubeVideo[],
  chatHistory: ChatMessage[] = []
): Promise<string> {
  try {
    debugLog('チャット応答生成開始:', {
      message: message,
      videosCount: videos.length
    })

    // チャットボット有効性チェック
    const enableChatbot = process.env.ENABLE_CHATBOT
    if (enableChatbot === 'false') {
      return 'チャットボット機能は現在無効になっています。管理者にお問い合わせください。'
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    
    if (!GROQ_API_KEY) {
      debugError('Groq APIキーが設定されていません')
      return 'チャットボット機能を利用するには、管理者にGROQ_API_KEYの設定を依頼してください。'
    }

    const groq = new Groq({
      apiKey: GROQ_API_KEY,
    })

    // RAGを使用してデータを準備
    const { data: videoData, count, type, source } = await prepareVideoDataWithRAG(videos, message)
    
    debugLog('データ準備完了:', {
      queryType: type,
      selectedCount: count,
      dataLength: videoData.length,
      source: source
    })

    // システムプロンプトを構築
    const systemPrompt = `あなたはYuNiというVTuberの動画情報アシスタントです。

以下の動画データを参照してユーザーの質問に回答してください：

${videoData}

回答ルール：
- 統計的質問には正確な数値で答える
- 動画のタイトルとURLを含める
- 親しみやすく日本語で回答
- データにない情報は推測しない
- 検索結果は${source === 'rag' ? 'AI検索システム' : '従来の検索'}を使用して取得されました`

    // メッセージを構築（履歴を制限）
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...chatHistory.slice(-3).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ]

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800,
    })

    const result = completion.choices[0]?.message?.content || 'すみません、回答を生成できませんでした。'
    debugLog('Groq API応答成功:', { resultLength: result.length })
    
    return result
  } catch (error) {
    debugError('Groq API エラー:', error)
    
    if (error instanceof Error) {
      debugError('Groqエラー詳細:', {
        name: error.name,
        message: error.message
      })
      
      // Groq公式ドキュメントに基づくエラーハンドリング
      // https://console.groq.com/docs/errors
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'APIキーが無効です。管理者にGROQ_API_KEYの確認を依頼してください。'
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        // 429 Too Many Requests: Groq公式のレート制限エラー
        return `🕐 申し訳ございません。現在、AIアシスタントへのアクセスが集中しており、一時的に利用制限に達しています。

⏰ **1分程度お待ちいただいてから、もう一度お試しください。**

この制限は短時間で解除されますので、少しお時間をいただければと思います。ご不便をおかけして申し訳ありません。

💡 **ヒント**: 
- 質問を簡潔にまとめていただくと、より効率的に回答できます
- 複数の質問がある場合は、一つずつお聞きください

お待ちいただき、ありがとうございます！🙏`
      } else if (error.message.includes('498') || error.message.includes('Flex Tier Capacity Exceeded')) {
        // 498 Custom: Flex Tier Capacity Exceeded
        return `⚡ 現在、Groq Flexサービスの容量が上限に達しています。

⏰ **しばらく経ってから、もう一度お試しください。**

このエラーは一時的なものですので、少しお時間をいただければと思います。`
      } else if (error.message.includes('413') || error.message.includes('Request Entity Too Large')) {
        // 413 Request Entity Too Large
        return '送信されたメッセージが長すぎます。質問を短くしてもう一度お試しください。'
      } else if (error.message.includes('422') || error.message.includes('Unprocessable Entity')) {
        // 422 Unprocessable Entity
        return 'リクエストの内容に問題があります。質問を見直してもう一度お試しください。'
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        // 500 Internal Server Error
        return 'サーバー内部エラーが発生しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
        // 502 Bad Gateway
        return 'サーバー接続エラーが発生しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        // 503 Service Unavailable
        return 'サービスが一時的に利用できません。メンテナンス中の可能性があります。しばらく経ってからもう一度お試しください。'
      }
    }
    
    return 'すみません、現在チャットボットが利用できません。しばらく経ってからもう一度お試しください。'
  }
} 