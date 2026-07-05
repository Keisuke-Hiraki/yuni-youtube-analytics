export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
  isLiveContent: boolean
  isShort: boolean // ショート動画かどうかのフラグ
}

export interface ViewCountTag {
  label: string
  color: string
  threshold: number
}

// 再生回数に基づくタグの定義
export const VIEW_COUNT_TAGS: ViewCountTag[] = [
  {
    label: "100M plays",
    color: "!bg-cyan-400 !text-cyan-950 !border !border-cyan-200 dark:!bg-cyan-600 dark:!text-cyan-50",
    threshold: 100000000,
  }, // ダイヤモンド色
  {
    label: "10M plays",
    color: "!bg-yellow-400 !text-yellow-950 !border !border-yellow-200 dark:!bg-yellow-600 dark:!text-yellow-50",
    threshold: 10000000,
  }, // 金色
  {
    label: "1M plays",
    color: "!bg-gray-300 !text-gray-800 !border !border-gray-200 dark:!bg-gray-500 dark:!text-gray-50",
    threshold: 1000000,
  }, // 銀色
  {
    label: "100K plays",
    color: "!bg-amber-600 !text-white !border !border-amber-500 dark:!bg-amber-700 dark:!text-amber-50",
    threshold: 100000,
  }, // 銅色
]

// 動画の再生回数に基づいて適切なタグを返す関数
export function getViewCountTag(viewCount: number): ViewCountTag | null {
  for (const tag of VIEW_COUNT_TAGS) {
    if (viewCount >= tag.threshold) {
      return tag
    }
  }
  return null
}

import { debugLog, debugError } from '@/lib/utils'

// YouTube Data API v3 レスポンスの型定義（本アプリで使用するフィールドのみ）
interface YouTubePlaylistItemResource {
  snippet?: {
    resourceId?: {
      videoId?: string
    }
  }
}

interface YouTubePlaylistItemsResponse {
  items?: YouTubePlaylistItemResource[]
  nextPageToken?: string
}

interface YouTubeVideoThumbnail {
  url: string
}

interface YouTubeVideoItem {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: {
      high?: YouTubeVideoThumbnail
      default?: YouTubeVideoThumbnail
    }
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
  contentDetails: {
    duration: string
  }
  liveStreamingDetails?: unknown
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[]
}

// ISO 8601 duration pattern shared by parseDurationSeconds and formatDuration
const ISO_8601_DURATION_PATTERN = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/

/**
 * Parses an ISO 8601 duration string (e.g. "PT1M30S") into total seconds.
 * Returns null when the string does not match the expected pattern (e.g. "P0D" for live content),
 * so callers can distinguish "unparseable" from "genuinely 0 seconds" instead of silently
 * treating an unparseable duration as a (false) Short.
 * @param {string} duration - ISO 8601 duration string from the YouTube Data API
 * @returns {number | null} - Total duration in seconds, or null if unparseable
 */
function parseDurationSeconds(duration: string): number | null {
  const match = duration.match(ISO_8601_DURATION_PATTERN)
  if (!match) return null

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0

  return hours * 3600 + minutes * 60 + seconds
}

// Reads the optional MAX_VIDEO_RESULTS environment variable that caps how many
// videos getChannelVideos() will fetch. Shared between app/actions.ts and
// scripts/index-videos.ts: it lives here (rather than in app/actions.ts,
// which has a top-level "use server" directive) so that the standalone tsx
// script can import it without pulling in Next.js server-action bundling
// semantics.
// Returns undefined when unset, non-numeric, or <= 0, which getChannelVideos()
// treats as "no cap: fetch every video".
export function getMaxVideoResults(): number | undefined {
  const raw = process.env.MAX_VIDEO_RESULTS
  if (!raw) return undefined

  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return undefined

  return parsed
}

export async function getChannelVideos(channelId: string, maxResults?: number): Promise<YouTubeVideo[]> {
  try {
    // チャンネルのアップロード済みプレイリストIDを取得
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${process.env.YOUTUBE_API_KEY}`,
    )

    if (!channelResponse.ok) {
      throw new Error(`チャンネル情報の取得に失敗: ${channelResponse.status} ${channelResponse.statusText}`)
    }

    const channelData = await channelResponse.json()

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error("チャンネルが見つかりませんでした")
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // 全ての動画を取得するためのページネーション処理
    let allPlaylistItems: YouTubePlaylistItemResource[] = []
    let nextPageToken: string | null = null
    let totalFetched = 0

    // ページネーションを使用して全ての動画を取得
    // maxResults が undefined の場合は上限なし（nextPageToken が尽きるまで全件取得）
    do {
      // Page size stays at the API's per-request max (50) when there is no cap;
      // when capped, shrink the last page so we don't over-fetch past maxResults.
      const remaining = maxResults === undefined ? undefined : maxResults - totalFetched
      const pageSize = remaining === undefined ? 50 : Math.min(50, remaining)
      const pageUrl: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${pageSize}&playlistId=${uploadsPlaylistId}&key=${process.env.YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`

      const playlistResponse: Response = await fetch(pageUrl)

      if (!playlistResponse.ok) {
        throw new Error(`プレイリスト情報の取得に失敗: ${playlistResponse.status} ${playlistResponse.statusText}`)
      }

      const playlistData: YouTubePlaylistItemsResponse = await playlistResponse.json()

      if (!playlistData.items || playlistData.items.length === 0) {
        break
      }

      allPlaylistItems = [...allPlaylistItems, ...playlistData.items]
      totalFetched += playlistData.items.length
      nextPageToken = playlistData.nextPageToken || null

      // 最大件数に達したら終了（上限指定時のみ）
      if (maxResults !== undefined && totalFetched >= maxResults) {
        break
      }
    } while (nextPageToken)

    if (allPlaylistItems.length === 0) {
      return []
    }

    // 動画IDのリストを作成（50件ずつに分割）
    const videoIdChunks: string[][] = []
    const chunkSize = 50 // YouTube APIの制限

    for (let i = 0; i < allPlaylistItems.length; i += chunkSize) {
      const chunk = allPlaylistItems.slice(i, i + chunkSize)
        .map((item) => item?.snippet?.resourceId?.videoId)
        .filter((videoId): videoId is string => Boolean(videoId))
      if (chunk.length > 0) {
        videoIdChunks.push(chunk)
      }
    }

    // 各チャンクごとに動画の詳細情報を取得
    const allVideos: YouTubeVideo[] = []

    for (const videoIds of videoIdChunks) {
      // liveStreamingDetailsを追加して、ライブ配信情報も取得
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails,liveStreamingDetails&id=${videoIds.join(",")}&key=${process.env.YOUTUBE_API_KEY}`,
      )

      if (!videosResponse.ok) {
        throw new Error(`動画情報の取得に失敗: ${videosResponse.status} ${videosResponse.statusText}`)
      }

      const videosData: YouTubeVideosResponse = await videosResponse.json()

      if (videosData.items && videosData.items.length > 0) {
        const videos = videosData.items
          .filter((item) => item && item.id && item.snippet && item.statistics)
          .map((item) => {
          // タイトルに基づくショート判定
          const titleHasShorts =
            item.snippet.title.toLowerCase().includes("#shorts") || item.snippet.title.toLowerCase().includes("#short")

          // ライブ配信はdurationがP0D等になり得るため、ショート判定から除外
          const isLiveContent = !!item.liveStreamingDetails
          const durationSeconds = parseDurationSeconds(item.contentDetails.duration)
          // An unparseable duration must never be treated as a (false) Short;
          // only classify by duration when it was successfully parsed.
          const isShort = !isLiveContent && ((durationSeconds !== null && durationSeconds <= 60) || titleHasShorts)

          // 統計情報の安全な取得
          const statistics = item.statistics || {}

          // 数値変換を確実に行う
          const viewCount = statistics.viewCount ? Number.parseInt(statistics.viewCount, 10) : 0
          const likeCount = statistics.likeCount ? Number.parseInt(statistics.likeCount, 10) : 0
          const commentCount = statistics.commentCount ? Number.parseInt(statistics.commentCount, 10) : 0

          // デバッグ用に生の値と変換後の値をログ出力（最初の動画のみ）
          if (item.id === videoIds[0]) {
            debugLog(`動画ID ${item.id} の統計情報:`, {
              rawViewCount: statistics.viewCount,
              parsedViewCount: viewCount,
              rawLikeCount: statistics.likeCount,
              parsedLikeCount: likeCount,
            })
          }

          return {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || "",
            viewCount,
            likeCount,
            commentCount,
            duration: item.contentDetails.duration,
            // ライブ配信かどうかを判定
            isLiveContent,
            // ショート動画かどうかを設定
            isShort,
          }
        })

        allVideos.push(...videos)
      }
    }

    return allVideos
  } catch (error) {
    debugError("YouTube APIエラー:", error)
    // Re-throw so callers can distinguish "zero videos" from "fetch failed"
    throw error
  }
}

export function formatDuration(duration: string): string {
  // ISO 8601 形式の期間を読みやすい形式に変換
  const match = duration.match(ISO_8601_DURATION_PATTERN)
  if (!match) return "00:00"

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

export function formatDate(dateString: string, language = "ja"): string {
  const date = new Date(dateString)

  // タイムゾーンの設定
  const timeZone = language === "ja" ? "Asia/Tokyo" : "UTC"
  const timeZoneLabel = language === "ja" ? "JST" : "UTC"

  // 言語に応じたフォーマットを適用
  switch (language) {
    case "en":
      return `${date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone,
      })} ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone,
      })} ${timeZoneLabel}`
    case "zh":
      // 中国語の日付フォーマット
      // 日付オブジェクトを作成
      const zhDate = new Date(date.toLocaleString("en-US", { timeZone }))

      // 年月日を直接取得
      const zhYear = zhDate.getFullYear()
      const zhMonth = zhDate.getMonth() + 1
      const zhDay = zhDate.getDate()

      // 時間部分を取得
      const zhHours = zhDate.getHours().toString().padStart(2, "0")
      const zhMinutes = zhDate.getMinutes().toString().padStart(2, "0")

      // 正しい中国語形式で返す
      return `${zhYear}年${zhMonth}月${zhDay}日 ${zhHours}:${zhMinutes} ${timeZoneLabel}`
    case "ko":
      return `${date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone,
      })} ${date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      })} ${timeZoneLabel}`
    case "ja":
    default:
      return `${date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone,
      })} ${date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      })} ${timeZoneLabel}`
  }
}

// 大きな数値を読みやすくフォーマットする関数（カンマ区切り）
export function formatLargeNumber(num: number, language = "ja"): string {
  return new Intl.NumberFormat(
    language === "ja" ? "ja-JP" : language === "en" ? "en-US" : language === "zh" ? "zh-CN" : "ko-KR",
  ).format(num)
}
