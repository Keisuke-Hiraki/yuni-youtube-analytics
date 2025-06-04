"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye, ThumbsUp, MessageSquare, Calendar, ExternalLink } from "lucide-react"
import { type YouTubeVideo, formatNumber, formatDate, getViewCountTag } from "@/lib/youtube"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import { useMediaQuery } from "@/hooks/use-media-query"

interface VideoDetailDialogProps {
  video: YouTubeVideo
  onClose: () => void
}

export default function VideoDetailDialog({ video, onClose }: VideoDetailDialogProps) {
  const [showAnimation, setShowAnimation] = useState(false)
  const viewCountTag = getViewCountTag(video.viewCount)
  const { t, language } = useLanguage()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // 右クリックを防止する関数
  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  useEffect(() => {
    // ダイアログが開いたときにアニメーションを開始
    setShowAnimation(true)
  }, [])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-3xl transform transition-all duration-300 ${
          showAnimation ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } ${isMobile ? "p-3 sm:p-6 w-[calc(100%-16px)]" : ""}`}
        onContextMenu={preventContextMenu}
      >
        <DialogHeader className={isMobile ? "space-y-1" : ""}>
          <DialogTitle className={`${isMobile ? "text-lg" : "text-xl"}`}>{video.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap text-xs sm:text-sm">{formatDate(video.publishedAt, language)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formatNumber(video.viewCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formatNumber(video.likeCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formatNumber(video.commentCount)}</span>
            </div>
            {video.isShort && (
              <Badge variant="secondary" className="gap-1 flex items-center bg-red-100 text-red-800 text-xs">
                #shorts
              </Badge>
            )}
            {viewCountTag && (
              <Badge
                className={`gap-1 flex items-center ${viewCountTag.color} text-xs`}
                style={{
                  backgroundColor: viewCountTag.label.includes("100M")
                    ? "#22d3ee"
                    : viewCountTag.label.includes("10M")
                      ? "#facc15"
                      : viewCountTag.label.includes("1M")
                        ? "#d1d5db"
                        : "#d97706",
                  color:
                    viewCountTag.label.includes("100M") ||
                    viewCountTag.label.includes("10M") ||
                    viewCountTag.label.includes("1M")
                      ? "#1e293b"
                      : "#ffffff",
                }}
              >
                {viewCountTag.label}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="aspect-video w-full overflow-hidden rounded-md" onContextMenu={preventContextMenu}>
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${video.id}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full select-none"
          ></iframe>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            className="gap-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 text-xs sm:text-sm"
            onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank")}
          >
            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("viewOnYouTube")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
