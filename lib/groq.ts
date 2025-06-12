import { Groq } from 'groq-sdk'
import { YouTubeVideo } from './youtube'

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

// 動画データを圧縮形式で変換
function formatVideoCompact(video: YouTubeVideo): string {
  const date = video.publishedAt.split('T')[0]
  return `${video.title}|${video.viewCount}再生|${video.likeCount}いいね|${date}|https://youtu.be/${video.id}`
}

// 統計用の詳細フォーマット（必要最小限）
function formatVideoForStats(video: YouTubeVideo): string {
  return `${video.title}|再生:${video.viewCount}|いいね:${video.likeCount}|コメント:${video.commentCount}|日付:${video.publishedAt.split('T')[0]}`
}

// データを適切に選択・フォーマットする関数
function prepareVideoData(videos: YouTubeVideo[], message: string) {
  const queryType = analyzeQueryType(message)
  
  switch (queryType) {
    case 'statistical':
      // 統計的質問：データを年ごとにグループ化して要約
      const videosByYear = videos.reduce((acc, video) => {
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
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 10)
        
        statsData += `\n${year}年の動画:\n`
        statsData += topVideos.map(formatVideoForStats).join('\n')
        statsData += '\n'
      })
      
      return {
        data: statsData,
        count: videos.length,
        type: 'statistical'
      }
      
    case 'search':
      // 検索質問：キーワードマッチング
      const keywords = message.toLowerCase().split(/\s+/).filter(word => word.length > 1)
      const relevantVideos = videos.filter(video => {
        const searchText = `${video.title} ${video.description}`.toLowerCase()
        return keywords.some(keyword => searchText.includes(keyword))
      }).slice(0, 30)
      
      return {
        data: relevantVideos.map(formatVideoCompact).join('\n'),
        count: relevantVideos.length,
        type: 'search'
      }
      
    case 'recent':
      // 最新情報：日付順で最新50件
      const recentVideos = videos
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 50)
      
      return {
        data: recentVideos.map(formatVideoCompact).join('\n'),
        count: recentVideos.length,
        type: 'recent'
      }
      
    default:
      // 一般的質問：人気順で上位30件
      const popularVideos = videos
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 30)
      
      return {
        data: popularVideos.map(formatVideoCompact).join('\n'),
        count: popularVideos.length,
        type: 'general'
      }
  }
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

export async function generateChatResponse(
  message: string,
  videos: YouTubeVideo[],
  chatHistory: ChatMessage[] = []
): Promise<string> {
  try {
    console.log('チャット応答生成開始:', {
      message: message,
      videosCount: videos.length
    })

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    
    if (!GROQ_API_KEY) {
      console.error('Groq APIキーが設定されていません')
      return 'チャットボット機能を利用するには、管理者にGROQ_API_KEYの設定を依頼してください。'
    }

    const groq = new Groq({
      apiKey: GROQ_API_KEY,
    })

    // 質問タイプに応じてデータを準備
    const { data: videoData, count, type } = prepareVideoData(videos, message)
    
    console.log('データ準備完了:', {
      queryType: type,
      selectedCount: count,
      dataLength: videoData.length
    })

    // システムプロンプトを構築
    const systemPrompt = `あなたはYuNiというVTuberの動画情報アシスタントです。

以下の動画データを参照してユーザーの質問に回答してください：

${videoData}

回答ルール：
- 統計的質問には正確な数値で答える
- 動画のタイトルとURLを含める
- 親しみやすく日本語で回答
- データにない情報は推測しない`

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
    console.log('Groq API応答成功:', { resultLength: result.length })
    
    return result
  } catch (error) {
    console.error('Groq API エラー:', error)
    
    if (error instanceof Error) {
      console.error('Groqエラー詳細:', {
        name: error.name,
        message: error.message
      })
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'APIキーが無効です。管理者にGROQ_API_KEYの確認を依頼してください。'
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        return 'APIの利用制限に達しました。しばらく経ってからもう一度お試しください。'
      } else if (error.message.includes('model')) {
        return 'モデルの問題により回答を生成できませんでした。しばらく経ってからもう一度お試しください。'
      }
    }
    
    return 'すみません、現在チャットボットが利用できません。しばらく経ってからもう一度お試しください。'
  }
} 