import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse } from '@/lib/groq'
import { fetchYuNiVideos } from '@/app/actions'

// テスト用のGETエンドポイント
export async function GET() {
  return NextResponse.json({ 
    message: 'Chat API is working',
    timestamp: new Date().toISOString(),
    env: {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasYouTubeKey: !!process.env.YOUTUBE_API_KEY
    }
  })
}

export async function POST(request: NextRequest) {
  console.log('チャットAPI呼び出し開始')
  
  try {
    // リクエストボディの解析
    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error('リクエストボディのパースエラー:', parseError)
      return NextResponse.json(
        { error: 'リクエストボディが無効です' },
        { status: 400 }
      )
    }

    const { message, chatHistory } = requestBody
    console.log('受信したメッセージ:', { message: message?.substring(0, 100), historyLength: chatHistory?.length })

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

    console.log('動画データ取得開始')
    // 動画データを取得
    const { videos, error: videoError } = await fetchYuNiVideos()
    
    if (videoError) {
      console.error('動画データ取得エラー:', videoError)
      return NextResponse.json(
        { error: `動画データの取得に失敗しました: ${videoError}` },
        { status: 500 }
      )
    }

    console.log('動画データ取得完了:', { videosCount: videos.length })

    console.log('Groq API呼び出し開始')
    // Groq APIを使用して応答を生成
    const response = await generateChatResponse(message, videos, chatHistory)
    console.log('Groq API呼び出し完了:', { responseLength: response.length })

    return NextResponse.json({ response })
  } catch (error) {
    console.error('チャットAPI エラー:', error)
    console.error('エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし')
    
    // エラーの詳細情報を含むレスポンス
    let errorMessage = 'チャットボットでエラーが発生しました'
    let statusCode = 500
    
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
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
    } else {
      console.error('非Errorオブジェクト:', error)
      errorMessage += `\n\nエラー内容: ${String(error)}`
    }
    
    // 確実にJSONレスポンスを返す
    try {
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      )
    } catch (responseError) {
      console.error('レスポンス生成エラー:', responseError)
      // 最後の手段として、プレーンテキストレスポンスを返す
      return new Response(
        JSON.stringify({ error: 'サーバー内部エラーが発生しました' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
} 