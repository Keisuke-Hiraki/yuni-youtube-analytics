"use client"

import { useLanguage } from "@/lib/language-context"
import { SITE_TITLE } from "@/lib/language-context"
import { RefreshButton } from "@/components/refresh-button"
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
    <header className="mb-8 text-center">
      <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
        {SITE_TITLE}
      </h1>
      <p className="text-muted-foreground max-w-2xl mx-auto">{t("siteDescription")}</p>

      {channelInfo && (
        <div className="flex flex-wrap justify-center gap-4 mt-4 mb-2">
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{formatLargeNumber(channelInfo.subscriberCount, language)}</span>
            <span className="text-sm text-muted-foreground">{t("subscribers")}</span>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
            <Eye className="w-4 h-4 text-primary" />
            <span className="font-medium">{formatLargeNumber(channelInfo.viewCount, language)}</span>
            <span className="text-sm text-muted-foreground">{t("totalViews")}</span>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
            <Video className="w-4 h-4 text-primary" />
            <span className="font-medium">{formatLargeNumber(channelInfo.videoCount, language)}</span>
            <span className="text-sm text-muted-foreground">{t("totalVideos")}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-3">
        {totalCount > 0 && (
          <p className="text-sm">
            <span className="font-medium">{totalCount}</span> {t("videosAnalyzed")}
          </p>
        )}
        {lastUpdated && (
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {t("lastUpdated")}:{" "}
              <span>
                {new Date(lastUpdated).toLocaleString(
                  language === "ja" ? "ja-JP" : language === "en" ? "en-US" : language === "zh" ? "zh-CN" : "ko-KR",
                )}
              </span>
            </p>
            <RefreshButton />
          </div>
        )}
      </div>
    </header>
  )
}
