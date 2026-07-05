"use server"

import { getChannelVideos, getMaxVideoResults, type YouTubeVideo } from "@/lib/youtube"
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache"
import { debugLog, debugError } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

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

// Reads a required environment variable lazily (inside a function body, not at
// module top level). Throwing at module scope would crash `next build` /
// `generateMetadata` whenever the env var is absent, so validation happens on
// first use instead.
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Please set it in your environment (e.g. .env.local).`)
  }
  return value
}

// チャンネル情報を取得する関数
export async function getChannelInfo(): Promise<ChannelInfo | null> {
  try {
    const channelId = requireEnv("YOUTUBE_CHANNEL_ID")
    const apiKey = requireEnv("YOUTUBE_API_KEY")

    // 明示的にstatisticsパートを指定して、必要なデータを確実に取得
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`,
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
    // videosが配列でない場合の安全性チェック
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      debugLog("動画データが空のため、総再生回数は0を返します")
      return 0
    }
    
    // 全動画の再生回数を合計
    const totalViews = videos.reduce((total, video) => {
      if (!video || typeof video.viewCount !== 'number') return total
      return total + video.viewCount
    }, 0)
    debugLog(`計算された総再生回数: ${totalViews} (${videos.length}件の動画から)`)
    return totalViews
  } catch (error) {
    debugError("総再生回数計算エラー:", error)
    return 0
  }
}

// 動画データのみを取得する内部関数（エラー時は throw する）
//
// unstable_cache does not access cookies/headers, and this function does not
// use them either, so it is safe to wrap directly.
//
// IMPORTANT: this function throws on failure instead of returning an `error`
// field, so that unstable_cache never caches a failed fetch. If a failure
// result were returned (not thrown), unstable_cache would treat it as a
// successful value and lock in the error message for the full revalidate
// window (1 hour). channelInfo is intentionally NOT fetched here (see
// fetchChannelInfoRaw below) so that a channelInfo-only failure can never
// contaminate this cache entry.
async function fetchYuNiVideosRaw(): Promise<{
  videos: YouTubeVideo[]
  totalCount: number
  lastUpdated: string
}> {
  const channelId = requireEnv("YOUTUBE_CHANNEL_ID")

  // 動画データを取得（MAX_VIDEO_RESULTS 未設定時は全件取得）
  const videos = await getChannelVideos(channelId, getMaxVideoResults())

  // 最終更新日時を記録
  const lastUpdated = new Date().toISOString()

  return {
    videos,
    totalCount: videos.length,
    lastUpdated,
  }
}

// チャンネル情報のみを取得する内部関数（エラー・未取得時は throw する）
//
// getChannelInfo() が null を返した場合、ここで throw することで
// unstable_cache がフォールバック用のスタブ値をキャッシュしてしまうのを防ぐ。
// フォールバック値の生成は非キャッシュ側（呼び出し元）で行う。
async function fetchChannelInfoRaw(): Promise<ChannelInfo> {
  const channelInfo = await getChannelInfo()

  if (!channelInfo) {
    throw new Error("チャンネル情報の取得に失敗しました")
  }

  return channelInfo
}

// fetchYuNiVideosRaw を unstable_cache でラップしたもの。
// revalidate: 1時間ごとに再取得。tags: refreshVideoData から revalidateTag で明示的に無効化可能。
const getCachedVideos = unstable_cache(fetchYuNiVideosRaw, ["yuni-videos"], {
  revalidate: 3600,
  tags: ["videos"],
})

// fetchChannelInfoRaw を unstable_cache でラップしたもの。
// videos と同じ "videos" タグを使うことで、refreshVideoData から両方を
// まとめて無効化できる。
const getCachedChannelInfo = unstable_cache(fetchChannelInfoRaw, ["yuni-channel-info"], {
  revalidate: 3600,
  tags: ["videos"],
})

// channelInfo取得の失敗時に使う、最小限のフォールバック情報を組み立てる。
// APIから取得した総再生回数が0の場合は、動画データから代替計算する。
async function buildFallbackChannelInfo(channelId: string, videos: YouTubeVideo[]): Promise<ChannelInfo> {
  debugError("チャンネル情報の取得に失敗しました")

  // フォールバック値の viewCount は常に 0 から始まるため、
  // 総再生回数は必ず動画データからの代替計算で補う。
  debugLog("APIから取得した総再生回数が0のため、代替計算を使用します")
  const calculatedViewCount = await calculateTotalViewCount(videos)

  return {
    id: channelId,
    title: "YuNi Channel",
    description: "",
    subscriberCount: 0,
    viewCount: calculatedViewCount,
    videoCount: videos.length,
    thumbnailUrl: "",
  }
}

// channelInfo を取得し、失敗時はフォールバック値を返す（このロジック自体は
// キャッシュされないため、失敗しても次回呼び出しで再取得が試みられる）。
// fetchChannelInfo は呼び出し元がキャッシュ版・非キャッシュ版を選択できるように
// 引数として渡す。
async function resolveChannelInfo(
  channelId: string,
  videos: YouTubeVideo[],
  fetchChannelInfo: () => Promise<ChannelInfo>,
): Promise<ChannelInfo> {
  try {
    const channelInfo = await fetchChannelInfo()

    // APIから取得した総再生回数が0の場合、代替計算を使用（キャッシュ済みの
    // 値には手を加えず、返却直前にその場で補完する）
    if (channelInfo.viewCount === 0) {
      debugLog("APIから取得した総再生回数が0のため、代替計算を使用します")
      const calculatedViewCount = await calculateTotalViewCount(videos)
      return {
        ...channelInfo,
        viewCount: calculatedViewCount,
      }
    }

    return channelInfo
  } catch (error) {
    debugError("チャンネル情報取得エラー:", error)
    return buildFallbackChannelInfo(channelId, videos)
  }
}

// キャッシュ付きでデータを取得する関数（公開API・シグネチャは変更しない）
export async function fetchYuNiVideosWithCache(): Promise<{
  videos: YouTubeVideo[]
  error?: string
  totalCount: number
  lastUpdated: string
  channelInfo: ChannelInfo | null
}> {
  try {
    const { videos, totalCount, lastUpdated } = await getCachedVideos()
    const channelId = requireEnv("YOUTUBE_CHANNEL_ID")
    const channelInfo = await resolveChannelInfo(channelId, videos, getCachedChannelInfo)

    return {
      videos,
      totalCount,
      lastUpdated,
      channelInfo,
    }
  } catch (error) {
    // fetchYuNiVideosRaw throws on failure so that unstable_cache does not
    // cache the error. The error is converted to the `error` field here,
    // outside the cached function, on every call (not cached).
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

// 非キャッシュ版（API routeなど、常に最新データが必要な呼び出し元向け）
export async function fetchYuNiVideos(): Promise<{
  videos: YouTubeVideo[]
  error?: string
  totalCount: number
  lastUpdated: string
  channelInfo: ChannelInfo | null
}> {
  try {
    const channelId = requireEnv("YOUTUBE_CHANNEL_ID")
    const { videos, totalCount, lastUpdated } = await fetchYuNiVideosRaw()
    const channelInfo = await resolveChannelInfo(channelId, videos, fetchChannelInfoRaw)

    return {
      videos,
      totalCount,
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
  // Server Actions cannot reliably read the caller's IP, so a global key is
  // used to throttle refresh requests across all callers.
  const rateLimit = checkRateLimit("refresh-video-data", 3, 60_000)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: "更新は少し時間をおいてから再度お試しください",
    }
  }

  try {
    // "videos" タグの付いたキャッシュを無効化する
    revalidateTag("videos")
    debugLog("キャッシュタグ 'videos' を無効化しました")

    // 新しいデータを取得してキャッシュを更新
    await fetchYuNiVideosWithCache()

    // ルートパスのキャッシュを再検証
    revalidatePath("/")

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
