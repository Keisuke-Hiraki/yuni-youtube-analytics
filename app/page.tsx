import type { Metadata } from "next"
import { fetchYuNiVideos } from "./actions"
import VideoRanking from "@/components/video-ranking"
import { Suspense } from "react"
import Loading from "./loading"
import { SiteDescription } from "@/components/site-description"
import { MusicHero } from "@/components/hero/music-hero"
import { debugLog } from '@/lib/utils'

// キャッシュの有効期限を1時間に設定
export const revalidate = 3600 // 1時間ごとに自動更新

export async function generateMetadata(): Promise<Metadata> {
  // チャンネル情報を取得（既存の関数を再利用）
  const { channelInfo } = await fetchYuNiVideos()

  // 動的なメタデータを生成
  return {
    title: "YuNi Stellar Chart - 音楽の世界を彩るネオンランキング",
    description: `YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング。音楽の世界を彩る、ネオンに輝く動画ランキング。${
      channelInfo ? `チャンネル登録者数: ${channelInfo.subscriberCount.toLocaleString()}人` : ""
    }`,
    openGraph: {
      title: "YuNi Stellar Chart - 音楽の世界を彩るネオンランキング",
      description: `YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング。音楽の世界を彩る、ネオンに輝く動画ランキング。${
        channelInfo ? `チャンネル登録者数: ${channelInfo.subscriberCount.toLocaleString()}人` : ""
      }`,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 1200,
          alt: "YuNi Stellar Chart - 音楽の世界を彩るネオンランキング",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "YuNi Stellar Chart - 音楽の世界を彩るネオンランキング",
      description: `YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング。音楽の世界を彩る、ネオンに輝く動画ランキング。${
        channelInfo ? `チャンネル登録者数: ${channelInfo.subscriberCount.toLocaleString()}人` : ""
      }`,
      images: ["/og-image.png"],
    },
  }
}

export default async function Home() {
  // キャッシュを無効化するためのタイムスタンプパラメータを追加
  const timestamp = Date.now()
  debugLog(`ページ読み込み開始: ${new Date(timestamp).toISOString()}`)

  const { videos, error, totalCount, lastUpdated, channelInfo } = await fetchYuNiVideos()

  return (
    <>
      {/* ヒーローセクション */}
      <MusicHero />
      
      {/* メインコンテンツ */}
      <main className="max-w-screen-xl mx-auto py-16 px-4 md:px-6 relative z-10">
        <SiteDescription totalCount={totalCount} lastUpdated={lastUpdated} channelInfo={channelInfo} />

        {error ? (
          <div className="p-4 bg-red-500/20 border border-red-500 text-red-300 rounded-md backdrop-blur-sm">
            {error}
          </div>
        ) : (
          <Suspense fallback={<Loading />}>
            <VideoRanking initialVideos={videos} />
          </Suspense>
        )}
      </main>
    </>
  )
}
