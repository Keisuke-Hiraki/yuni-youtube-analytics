import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateChatResponse, type ChatMessage } from '@/lib/groq'
import { fetchYuNiVideos } from '@/app/actions'
import { debugLog, debugError } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

// チャットボット有効性チェック関数
function isChatbotEnabled(): boolean {
  const enableChatbot = process.env.ENABLE_CHATBOT
  const hasGroqKey = !!process.env.GROQ_API_KEY

  // ENABLE_CHATBOTが明示的にfalseの場合は無効
  if (enableChatbot === 'false') {
    return false
  }

  // ENABLE_CHATBOTがtrueまたは未設定の場合、APIキーの存在で判定
  return hasGroqKey
}

// レート制限設定: IPあたり1分間に10リクエストまで
const RATE_LIMIT_MAX_REQUESTS = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000

// リクエストボディの検証スキーマ
const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  chatHistory: z
    .array(
      z
        .object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(4000)
        })
        .strip()
    )
    .max(10)
    .optional()
})

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}

// テスト用のGETエンドポイント
export async function GET() {
  return NextResponse.json({
    enabled: isChatbotEnabled()
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

    // 入力バリデーション
    const parsed = chatRequestSchema.safeParse(requestBody)
    if (!parsed.success) {
      debugError('リクエストボディの検証エラー:', parsed.error.flatten())
      return NextResponse.json(
        { error: 'リクエストの内容が正しくありません。メッセージや履歴の形式をご確認ください。' },
        { status: 400 }
      )
    }

    const { message, chatHistory } = parsed.data

    // レート制限チェック（IP単位）
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)
    if (!rateLimitResult.allowed) {
      debugLog('レート制限超過:', { clientIp })
      return NextResponse.json(
        { error: 'リクエストが多くなっています。しばらく経ってからもう一度お試しください。' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds ?? 60)
          }
        }
      )
    }

    // チャットボット有効性チェック
    if (!isChatbotEnabled()) {
      return NextResponse.json(
        { error: 'チャットボット機能は現在無効になっています。' },
        { status: 503 }
      )
    }

    debugLog('受信したメッセージ:', { message: message.substring(0, 100), historyLength: chatHistory?.length })

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

    // 検証済みの履歴を generateChatResponse が期待する ChatMessage 形式に変換
    // (id/timestamp はクライアントから受け取らず、ここで補完する)
    const chatHistoryForGroq: ChatMessage[] = (chatHistory ?? []).map((entry, index) => ({
      id: `history-${index}`,
      role: entry.role,
      content: entry.content,
      timestamp: new Date()
    }))

    debugLog('Groq API呼び出し開始')
    // Groq APIを使用して応答を生成
    const response = await generateChatResponse(message, videos, chatHistoryForGroq)
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
        // 内部エラーの詳細はクライアントに公開せず、ログにのみ記録する
        errorMessage = 'チャットボットでエラーが発生しました。しばらく経ってからもう一度お試しください。'
      }
    } else {
      debugError('非Errorオブジェクト:', error)
      errorMessage = 'チャットボットでエラーが発生しました。しばらく経ってからもう一度お試しください。'
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
