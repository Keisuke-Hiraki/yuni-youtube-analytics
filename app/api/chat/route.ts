import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse } from '@/lib/groq'
import { fetchYuNiVideos } from '@/app/actions'
import { debugLog, debugError } from '@/lib/utils'

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
  debugLog('チャットAPI呼び出し開始')
  
  try {
    // リクエストボディの解析
    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      debugError('リクエストボディのパースエラー:', parseError)
      return NextResponse.json(
        { error: 'リクエストボディが無効です' },
        { status: 400 }
      )
    }

    const { message, chatHistory } = requestBody
    debugLog('受信したメッセージ:', { message: message?.substring(0, 100), historyLength: chatHistory?.length })

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    if (!process.env.GROQ_API_KEY) {
      debugError('GROQ_API_KEY環境変数が設定されていません')
      return NextResponse.json(
        { error: 'GROQ_API_KEY環境変数が設定されていません。管理者に設定を依頼してください。' },
        { status: 500 }
      )
    }

    debugLog('動画データ取得開始')
    // 動画データを取得
    const { videos, error: videoError } = await fetchYuNiVideos()
    
    if (videoError) {
      debugError('動画データ取得エラー:', videoError)
      return NextResponse.json(
        { error: `動画データの取得に失敗しました: ${videoError}` },
        { status: 500 }
      )
    }

    debugLog('動画データ取得完了:', { videosCount: videos.length })

    debugLog('Groq API呼び出し開始')
    // Groq APIを使用して応答を生成
    const response = await generateChatResponse(message, videos, chatHistory)
    debugLog('Groq API呼び出し完了:', { responseLength: response.length })

    return NextResponse.json({ response })
  } catch (error) {
    debugError('チャットAPI エラー:', error)
    debugError('エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし')
    
    // エラーの詳細情報を含むレスポンス
    let errorMessage = 'チャットボットでエラーが発生しました'
    let statusCode = 500
    
    if (error instanceof Error) {
      debugError('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      // Groq公式ドキュメントに基づくエラーハンドリング
      // https://console.groq.com/docs/errors
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        statusCode = 401
        errorMessage = 'APIキーが無効です。管理者にGROQ_API_KEYの確認を依頼してください。'
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        // 429 Too Many Requests: Groq公式のレート制限エラー
        statusCode = 429
        errorMessage = `🕐 申し訳ございません。現在、AIアシスタントへのアクセスが集中しており、一時的に利用制限に達しています。

⏰ **1分程度お待ちいただいてから、もう一度お試しください。**

この制限は短時間で解除されますので、少しお時間をいただければと思います。ご不便をおかけして申し訳ありません。

💡 **ヒント**: 
- 質問を簡潔にまとめていただくと、より効率的に回答できます
- 複数の質問がある場合は、一つずつお聞きください

お待ちいただき、ありがとうございます！🙏`
      } else if (error.message.includes('498') || error.message.includes('Flex Tier Capacity Exceeded')) {
        // 498 Custom: Flex Tier Capacity Exceeded
        statusCode = 498
        errorMessage = `⚡ 現在、Groq Flexサービスの容量が上限に達しています。

⏰ **しばらく経ってから、もう一度お試しください。**

このエラーは一時的なものですので、少しお時間をいただければと思います。`
      } else if (error.message.includes('413') || error.message.includes('Request Entity Too Large')) {
        // 413 Request Entity Too Large
        statusCode = 413
        errorMessage = '送信されたメッセージが長すぎます。質問を短くしてもう一度お試しください。'
      } else if (error.message.includes('422') || error.message.includes('Unprocessable Entity')) {
        // 422 Unprocessable Entity
        statusCode = 422
        errorMessage = 'リクエストの内容に問題があります。質問を見直してもう一度お試しください。'
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        // 500 Internal Server Error
        statusCode = 500
        errorMessage = 'サーバー内部エラーが発生しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
        // 502 Bad Gateway
        statusCode = 502
        errorMessage = 'サーバー接続エラーが発生しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        // 503 Service Unavailable
        statusCode = 503
        errorMessage = 'サービスが一時的に利用できません。メンテナンス中の可能性があります。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        statusCode = 503
        errorMessage = 'ネットワークエラーまたはサービスが一時的に利用できません。しばらく経ってからもう一度お試しください。'
      } else {
        errorMessage += `\n\nエラー詳細:\n名前: ${error.name}\nメッセージ: ${error.message}`
      }
    } else {
      debugError('非Errorオブジェクト:', error)
      errorMessage += `\n\nエラー内容: ${String(error)}`
    }
    
    // 確実にJSONレスポンスを返す
    try {
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      )
    } catch (responseError) {
      debugError('レスポンス生成エラー:', responseError)
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