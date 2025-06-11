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
視聴回数: ${video.viewCount.toLocaleString()}回
いいね数: ${video.likeCount.toLocaleString()}
コメント数: ${video.commentCount.toLocaleString()}
公開日: ${video.publishedAt}
URL: https://www.youtube.com/watch?v=${video.id}`
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

    // 全ての動画情報をフォーマット
    const allVideosData = videos.map(formatVideoForSearch).join('\n\n---\n\n')
    
    // デバッグログ: 動画データの確認
    console.log('全動画データ準備完了:', {
      totalVideos: videos.length,
      dataLength: allVideosData.length
    })
    
    // システムプロンプトを構築
    const systemPrompt = `あなたはYuNiというVTuberの動画情報アシスタントです。
ユーザーの質問に対して、以下に提供された全ての動画データを参照して回答してください。

【重要】以下の動画データベースを使用して回答してください：
${allVideosData}

【回答ルール】
1. 上記の動画データから関連する情報を引用してください
2. 動画のタイトル、視聴回数、いいね数、コメント数、公開日などの具体的な数値を含めてください
3. 動画のURLも提供してください
4. 親しみやすく、丁寧な口調で回答してください
5. 日本語で回答してください
6. 質問に応じて適切な動画を選択して紹介してください
7. 統計的な質問（最も人気、最新、など）には正確な数値で回答してください

【禁止事項】
- 提供された動画データを無視して一般的な回答をすること
- 動画データがあるのに「情報がありません」と回答すること
- 不正確な数値や情報を提供すること`

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

    const result = completion.choices[0]?.message?.content || 'すみません、回答を生成できませんでした。'
    console.log('Groq API応答成功:', { resultLength: result.length })
    
    return result
  } catch (error) {
    console.error('Groq API エラー:', error)
    console.error('エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし')
    
    // より詳細なエラー情報を提供
    if (error instanceof Error) {
      console.error('Groqエラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'APIキーが無効です。管理者にGROQ_API_KEYの確認を依頼してください。'
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        return 'APIの利用制限に達しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      } else if (error.message.includes('model')) {
        return 'モデルの問題により回答を生成できませんでした。しばらく経ってからもう一度お試しください。'
      }
    }
    
    return 'すみません、現在チャットボットが利用できません。しばらく経ってからもう一度お試しください。'
  }
} 