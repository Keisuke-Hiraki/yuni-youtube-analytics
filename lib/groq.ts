import Groq from 'groq-sdk'
import { YouTubeVideo } from './youtube'

// 環境変数の確認
const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY環境変数が設定されていません')
}

// Groqクライアントの初期化
const groq = GROQ_API_KEY ? new Groq({
  apiKey: GROQ_API_KEY,
}) : null

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
  
  return videos.filter(video => {
    const searchText = `${video.title} ${video.description}`.toLowerCase()
    return searchTerms.some(term => searchText.includes(term))
  }).slice(0, 5) // 最大5件まで
}

// Groq APIを使用してチャット応答を生成
export async function generateChatResponse(
  message: string,
  videos: YouTubeVideo[],
  chatHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // 環境変数が設定されていない場合の処理
    if (!groq || !GROQ_API_KEY) {
      console.error('Groq APIキーが設定されていません')
      return 'チャットボット機能を利用するには、管理者にGROQ_API_KEYの設定を依頼してください。'
    }

    // 関連する動画を検索
    const relevantVideos = searchVideos(videos, message)
    
    // システムプロンプトを構築
    const systemPrompt = `あなたはYuNiというVTuberの動画情報アシスタントです。
ユーザーの質問に対して、提供された動画データを基に正確で親しみやすい回答をしてください。

利用可能な動画データ:
${relevantVideos.length > 0 
  ? relevantVideos.map(formatVideoForSearch).join('\n\n---\n\n')
  : '関連する動画が見つかりませんでした。一般的な情報で回答してください。'
}

回答の際は以下を心がけてください:
- 親しみやすく、丁寧な口調で回答する
- 具体的な数値や日付を含める
- 動画のタイトルやURLを適切に引用する
- 質問に直接関係のない情報は含めない
- 日本語で回答する`

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
      model: 'llama-3.1-70b-versatile',
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