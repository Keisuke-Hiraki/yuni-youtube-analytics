"use client"

import { useLanguage } from "@/lib/language-context"
import { SITE_TITLE } from "@/lib/language-context"
import { RefreshButton } from "@/components/refresh-button"
import { NeonText } from "@/components/neon/neon-text"
import { formatLargeNumber } from "@/lib/youtube"
import { Eye, Users, Video } from "lucide-react"
import type { ChannelInfo } from "@/app/actions"

interface SiteDescriptionProps {
  totalCount: number
  lastUpdated: string
  channelInfo: ChannelInfo | null
}

export function SiteDescription({ totalCount, lastUpdated, channelInfo }: SiteDescriptionProps) {
  const { t, language } = useLanguage()

  return (
    <header className="mb-12 text-center relative">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/5 via-neon-cyan/5 to-neon-green/5 rounded-2xl blur-xl" />
      
      <div className="relative z-10">
        <NeonText size="xl" color="cyan" className="mb-4">
          音楽ランキング
        </NeonText>
        <p className="text-gray-300 max-w-2xl mx-auto mb-6 text-lg">
          {t("siteDescription")}
        </p>

        {channelInfo && (
          <div className="flex flex-wrap justify-center gap-6 mt-8 mb-6">
            <div className="flex items-center gap-3 bg-vinyl-black/60 border border-neon-pink/30 px-4 py-3 rounded-xl backdrop-blur-sm neon-glow-pink">
              <Users className="w-5 h-5 text-neon-pink" />
              <div className="text-left">
                <div className="font-bold text-neon-pink text-lg">{formatLargeNumber(channelInfo.subscriberCount, language)}</div>
                <div className="text-xs text-gray-400">{t("subscribers")}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-vinyl-black/60 border border-neon-cyan/30 px-4 py-3 rounded-xl backdrop-blur-sm neon-glow-cyan">
              <Eye className="w-5 h-5 text-neon-cyan" />
              <div className="text-left">
                <div className="font-bold text-neon-cyan text-lg">{formatLargeNumber(channelInfo.viewCount, language)}</div>
                <div className="text-xs text-gray-400">{t("totalViews")}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-vinyl-black/60 border border-neon-green/30 px-4 py-3 rounded-xl backdrop-blur-sm neon-glow-green">
              <Video className="w-5 h-5 text-neon-green" />
              <div className="text-left">
                <div className="font-bold text-neon-green text-lg">{formatLargeNumber(channelInfo.videoCount, language)}</div>
                <div className="text-xs text-gray-400">{t("totalVideos")}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-6">
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-neon-purple font-bold text-lg">{totalCount}</span>
              <span className="text-gray-300">{t("videosAnalyzed")}</span>
            </div>
          )}
          {lastUpdated && (
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-gray-400">
                {t("lastUpdated")}:{" "}
                <span className="text-neon-orange">
                  {new Date(lastUpdated).toLocaleString(
                    language === "ja" ? "ja-JP" : language === "en" ? "en-US" : language === "zh" ? "zh-CN" : "ko-KR",
                  )}
                </span>
              </p>
              <RefreshButton />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
