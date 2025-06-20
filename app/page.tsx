import type { Metadata } from "next"
import { fetchYuNiVideosWithCache } from "./actions"
import VideoRanking from "@/components/video-ranking"
import { Suspense } from "react"
import Loading from "./loading"
import { SiteDescription } from "@/components/site-description"
import { MusicHero } from "@/components/hero/music-hero"
import { debugLog } from '@/lib/utils'

// キャッシュの有効期限を1時間に設定
export const revalidate = 3600 // 1時間ごとに自動更新

// 環境変数でヒーローセクションの表示を制御
const SHOW_HERO_SECTION = process.env.SHOW_HERO_SECTION !== 'false'

export async function generateMetadata(): Promise<Metadata> {
  // チャンネル情報を取得（キャッシュ機能付きの関数を使用）
  const { channelInfo } = await fetchYuNiVideosWithCache()

  // 動的なメタデータを生成
  return {
    title: "YuNi Stellar Chart",
    description: `Vsinger YuNiの動画をランキング`,
    openGraph: {
      title: "YuNi Stellar Chart",
      description: `Vsinger YuNiの動画をランキング。`,
      url: "https://yuni-stellar-chart.vercel.app",
      siteName: "YuNi Stellar Chart",
      images: [
        {
          url: "https://yuni-stellar-chart.vercel.app/og-image.png",
          width: 1200,
          height: 1200,
          alt: "YuNi Stellar Chart - Vsinger YuNiの動画分析ツール",
        },
      ],
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "YuNi Stellar Char",
      description: `Vsinger YuNiの動画をランキング`,
      images: ["https://yuni-stellar-chart.vercel.app/og-image.png"],
    },
  }
}

export default async function Home() {
  // キャッシュを無効化するためのタイムスタンプパラメータを追加
  const timestamp = Date.now()
  debugLog(`ページ読み込み開始: ${new Date(timestamp).toISOString()}`)

  // キャッシュされたデータを取得（新しい関数を使用）
  const { videos, error, totalCount, lastUpdated, channelInfo } = await fetchYuNiVideosWithCache()

  return (
    <>
      {/* ヒーローセクション - 環境変数で制御 */}
      {SHOW_HERO_SECTION && <MusicHero />}
      
      {/* メインコンテンツ */}
      <main className={`max-w-screen-xl mx-auto py-16 px-4 md:px-6 relative z-10 ${!SHOW_HERO_SECTION ? 'pt-24' : ''}`}>
        <SiteDescription totalCount={totalCount} lastUpdated={lastUpdated} channelInfo={channelInfo} />

        {error ? (
          <div className="p-4 bg-red-500/20 border border-red-500 text-red-300 rounded-md backdrop-blur-sm">
            {error}
          </div>
        ) : (
          <Suspense fallback={<Loading />}>
            <VideoRanking initialVideos={videos || []} />
          </Suspense>
        )}
      </main>
    </>
  )
}
