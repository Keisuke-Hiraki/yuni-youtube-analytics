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

export default async function Home() {
  debugLog(`ページ読み込み開始: ${new Date().toISOString()}`)

  // キャッシュされたデータを取得（新しい関数を使用）
  const { videos, error, totalCount, lastUpdated, channelInfo } = await fetchYuNiVideosWithCache()

  // Build JSON-LD structured data
  const jsonLdData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'YuNi Stellar Chart',
        url: 'https://yuni-stellar-chart.vercel.app',
      },
      ...(videos && videos.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: 'YuNi Video Ranking',
              itemListElement: videos.slice(0, 10).map((video, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'VideoObject',
                  name: video.title,
                  description: video.description?.slice(0, 200) || video.title,
                  ...(video.thumbnailUrl && { thumbnailUrl: video.thumbnailUrl }),
                  uploadDate: video.publishedAt,
                  url: `https://www.youtube.com/watch?v=${video.id}`,
                },
              })),
            },
          ]
        : []),
    ],
  }

  // Escape JSON-LD data to prevent XSS (replace < with <)
  const jsonLdString = JSON.stringify(jsonLdData).replace(/</g, '\\u003c')

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />

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
