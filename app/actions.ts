"use server"

import { getChannelVideos, type YouTubeVideo } from "@/lib/youtube"
import { revalidatePath } from "next/cache"
import { debugLog, debugError } from '@/lib/utils'

// YuNiさんのチャンネルID
const CHANNEL_ID = "UCHTnX0CSX_KObo5I9WuZ64g"

// チャンネル情報の型定義
export interface ChannelInfo {
  id: string
  title: string
  description: string
  subscriberCount: number
  viewCount: number
  videoCount: number
  thumbnailUrl: string
}

// チャンネル情報を取得する関数
export async function getChannelInfo(): Promise<ChannelInfo | null> {
  try {
    // キャッシュを無効化するためのタイムスタンプパラメータを追加
    const timestamp = Date.now()

    // 明示的にstatisticsパートを指定して、必要なデータを確実に取得
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${CHANNEL_ID}&key=${process.env.YOUTUBE_API_KEY}&_t=${timestamp}`,
      { cache: "no-store" }, // キャッシュを完全に無効化
    )

    if (!response.ok) {
      debugError(`API応答エラー: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    // デバッグ用にレスポンスの内容をログに出力
    debugLog("チャンネル情報API応答:", JSON.stringify(data, null, 2))

    if (!data.items || data.items.length === 0) {
      debugError("チャンネル情報が見つかりません")
      return null
    }

    const channel = data.items[0]

    // statistics オブジェクトの存在確認
    if (!channel.statistics) {
      debugError("統計情報が見つかりません:", channel)
      return null
    }

    // 生のデータをログに出力
    debugLog("生の統計情報:", channel.statistics)

    // 各統計値の存在確認とパース処理の改善
    const subscriberCount = channel.statistics.subscriberCount
      ? Number.parseInt(channel.statistics.subscriberCount, 10)
      : 0

    const viewCount = channel.statistics.viewCount ? Number.parseInt(channel.statistics.viewCount, 10) : 0

    const videoCount = channel.statistics.videoCount ? Number.parseInt(channel.statistics.videoCount, 10) : 0

    // デバッグ用に変換後の値をログに出力
    debugLog("パース後の統計情報:", {
      subscriberCount,
      viewCount,
      videoCount,
      rawViewCount: channel.statistics.viewCount,
    })

    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      subscriberCount,
      viewCount,
      videoCount,
      thumbnailUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
    }
  } catch (error) {
    debugError("チャンネル情報取得エラー:", error)
    return null
  }
}

// 動画の総再生回数を計算する代替関数
async function calculateTotalViewCount(videos: YouTubeVideo[]): Promise<number> {
  try {
    // 全動画の再生回数を合計
    const totalViews = videos.reduce((total, video) => total + video.viewCount, 0)
    debugLog(`計算された総再生回数: ${totalViews} (${videos.length}件の動画から)`)
    return totalViews
  } catch (error) {
    debugError("総再生回数計算エラー:", error)
    return 0
  }
}

// キャッシュの有効期限を1時間に設定
export async function fetchYuNiVideos(): Promise<{
  videos: YouTubeVideo[]
  error?: string
  totalCount: number
  lastUpdated: string
  channelInfo: ChannelInfo | null
}> {
  try {
    // 動画データを取得
    const videos = await getChannelVideos(CHANNEL_ID, 500)

    // チャンネル情報を取得
    let channelInfo = await getChannelInfo()

    // チャンネル情報が取得できなかった場合のログ
    if (!channelInfo) {
      debugError("チャンネル情報の取得に失敗しました")
      // 最小限のチャンネル情報を作成
      channelInfo = {
        id: CHANNEL_ID,
        title: "YuNi Channel",
        description: "",
        subscriberCount: 0,
        viewCount: 0,
        videoCount: videos.length,
        thumbnailUrl: "",
      }
    }

    // APIから取得した総再生回数が0の場合、代替計算を使用
    if (channelInfo.viewCount === 0) {
      debugLog("APIから取得した総再生回数が0のため、代替計算を使用します")
      const calculatedViewCount = await calculateTotalViewCount(videos)

      // 計算した値で更新
      channelInfo = {
        ...channelInfo,
        viewCount: calculatedViewCount,
      }
    }

    debugLog("最終的なチャンネル情報:", {
      title: channelInfo.title,
      subscriberCount: channelInfo.subscriberCount,
      viewCount: channelInfo.viewCount,
      videoCount: channelInfo.videoCount,
    })

    // 最終更新日時を記録
    const lastUpdated = new Date().toISOString()

    return {
      videos,
      totalCount: videos.length,
      lastUpdated,
      channelInfo,
    }
  } catch (error) {
    debugError("動画取得エラー:", error)
    return {
      videos: [],
      error: "動画データの取得に失敗しました。しばらく経ってからもう一度お試しください。",
      totalCount: 0,
      lastUpdated: new Date().toISOString(),
      channelInfo: null,
    }
  }
}

// キャッシュを強制的に更新するためのアクション
export async function refreshVideoData(): Promise<{
  success: boolean
  message: string
}> {
  try {
    // 意図的に少し遅延させて、プログレスバーの動きを見せる
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // ルートパスのキャッシュを再検証
    revalidatePath("/")

    // さらに少し遅延させて、プログレスバーの動きを見せる
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      success: true,
      message: "動画データを更新しました",
    }
  } catch (error) {
    debugError("キャッシュ更新エラー:", error)
    return {
      success: false,
      message: "データの更新に失敗しました",
    }
  }
}
