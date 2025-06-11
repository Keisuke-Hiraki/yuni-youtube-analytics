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

    // 動画データを取得
    const { videos } = await fetchYuNiVideos()

    // Groq APIを使用して応答を生成
    const response = await generateChatResponse(message, videos, chatHistory)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('チャットAPI エラー:', error)
    return NextResponse.json(
      { error: 'チャットボットでエラーが発生しました' },
      { status: 500 }
    )
  }
} 