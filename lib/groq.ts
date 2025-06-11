import { Groq } from 'groq-sdk'
import { YouTubeVideo } from './youtube'

// チャットメッセージの型定義
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 動画データを検索用のテキストに変換
function formatVideoForSearch(video: YouTubeVideo): string {
  return `タイトル: ${video.title}
説明: ${video.description}
再生回数: ${video.viewCount.toLocaleString()}回
いいね数: ${video.likeCount.toLocaleString()}
公開日: ${video.publishedAt}
URL: https://www.youtube.com/watch?v=${video.id}`
}

// 動画データベースから関連する動画を検索
export function searchVideos(videos: YouTubeVideo[], query: string): YouTubeVideo[] {
  const searchTerms = query.toLowerCase().split(' ')
  
  // まず関連動画を検索
  const relevantVideos = videos.filter(video => {
    const searchText = `${video.title} ${video.description}`.toLowerCase()
    return searchTerms.some(term => searchText.includes(term))
  })
  
  // 検索結果が少ない場合は、より広範囲で検索
  let finalVideos = relevantVideos
  if (relevantVideos.length < 3) {
    // 部分一致でも検索
    const partialMatches = videos.filter(video => {
      const searchText = `${video.title} ${video.description}`.toLowerCase()
      return searchTerms.some(term => 
        term.length > 2 && searchText.includes(term.substring(0, Math.max(2, term.length - 1)))
      )
    })
    
    // 重複を除去して結合
    const combined = [...relevantVideos]
    partialMatches.forEach(video => {
      if (!combined.find(v => v.id === video.id)) {
        combined.push(video)
      }
    })
    finalVideos = combined
  }
  
  // それでも少ない場合は人気動画を追加
  if (finalVideos.length < 3) {
    const popularVideos = [...videos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
    
    popularVideos.forEach(video => {
      if (!finalVideos.find(v => v.id === video.id) && finalVideos.length < 5) {
        finalVideos.push(video)
      }
    })
  }
  
  // 最大5件まで
  const result = finalVideos.slice(0, 5)
  
  // デバッグログ追加
  console.log('動画検索デバッグ:', {
    totalVideos: videos.length,
    searchQuery: query,
    searchTerms: searchTerms,
    relevantVideos: relevantVideos.length,
    finalVideos: result.length,
    foundTitles: result.map(v => v.title)
  })
  
  return result
}

// Groq APIを使用してチャット応答を生成
export async function generateChatResponse(
  message: string,
  videos: YouTubeVideo[],
  chatHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // デバッグログ: 入力データの確認
    console.log('チャット応答生成開始:', {
      message: message,
      videosCount: videos.length,
      sampleVideoTitles: videos.slice(0, 3).map(v => v.title)
    })

    // 環境変数の確認（関数内で行う）
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    
    if (!GROQ_API_KEY) {
      console.error('Groq APIキーが設定されていません')
      return 'チャットボット機能を利用するには、管理者にGROQ_API_KEYの設定を依頼してください。'
    }

    // Groqクライアントを関数内で初期化
    const groq = new Groq({
      apiKey: GROQ_API_KEY,
    })

    // 関連する動画を検索
    const relevantVideos = searchVideos(videos, message)
    
    // デバッグログ: 検索結果の確認
    console.log('関連動画検索結果:', {
      relevantVideosCount: relevantVideos.length,
      relevantVideoTitles: relevantVideos.map(v => v.title)
    })
    
    // システムプロンプトを構築
    const videoDataSection = relevantVideos.length > 0 
      ? relevantVideos.map(formatVideoForSearch).join('\n\n---\n\n')
      : '関連する動画が見つかりませんでした。一般的な情報で回答してください。'
    
    // デバッグログ: システムプロンプトの動画データ部分
    console.log('システムプロンプト動画データ部分:', videoDataSection.substring(0, 500) + '...')
    
    const systemPrompt = `あなたはYuNiというVTuberの動画情報アシスタントです。
ユーザーの質問に対して、以下に提供された動画データを必ず参照して回答してください。

【重要】以下の動画データを必ず使用して回答してください：
${videoDataSection}

【回答ルール】
1. 上記の動画データから関連する情報を必ず引用してください
2. 動画のタイトル、再生回数、いいね数、公開日などの具体的な数値を含めてください
3. 動画のURLも提供してください
4. 親しみやすく、丁寧な口調で回答してください
5. 日本語で回答してください
6. 動画データが提供されている場合は、一般的な情報ではなく、必ず提供されたデータに基づいて回答してください

【禁止事項】
- 提供された動画データを無視して一般的な回答をすること
- 動画データがあるのに「情報がありません」と回答すること`

    // チャット履歴を含めたメッセージを構築
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...chatHistory.slice(-6).map(msg => ({ // 直近6件の履歴のみ使用
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ]

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile', // 最新モデルに更新
      temperature: 0.7,
      max_tokens: 1000,
    })

    return completion.choices[0]?.message?.content || 'すみません、回答を生成できませんでした。'
  } catch (error) {
    console.error('Groq API エラー:', error)
    
    // より詳細なエラー情報を提供
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'APIキーが無効です。管理者にGROQ_API_KEYの確認を依頼してください。'
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        return 'APIの利用制限に達しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      }
    }
    
    return 'すみません、現在チャットボットが利用できません。しばらく経ってからもう一度お試しください。'
  }
} 