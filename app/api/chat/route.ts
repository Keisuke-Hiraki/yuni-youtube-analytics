import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse } from '@/lib/groq'
import { fetchYuNiVideos } from '@/app/actions'

export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY環境変数が設定されていません')
      return NextResponse.json(
        { error: 'GROQ_API_KEY環境変数が設定されていません。管理者に設定を依頼してください。' },
        { status: 500 }
      )
    }

    // 動画データを取得
    const { videos } = await fetchYuNiVideos()

    // Groq APIを使用して応答を生成
    const response = await generateChatResponse(message, videos, chatHistory)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('チャットAPI エラー:', error)
    
    // エラーの詳細情報を含むレスポンス
    let errorMessage = 'チャットボットでエラーが発生しました'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage += `\n\nエラー詳細:\n名前: ${error.name}\nメッセージ: ${error.message}`
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401
        errorMessage += '\n\n原因: APIキーが無効です'
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        statusCode = 429
        errorMessage += '\n\n原因: APIの利用制限に達しました'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        statusCode = 503
        errorMessage += '\n\n原因: ネットワークエラーまたはサービス利用不可'
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
} 