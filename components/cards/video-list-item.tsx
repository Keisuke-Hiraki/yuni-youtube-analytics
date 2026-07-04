"use client"

import type React from "react"
import { memo } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Eye, ThumbsUp, MessageSquare, Clock } from "lucide-react"
import { type YouTubeVideo, formatNumber, formatDate, formatDuration, getViewCountTag } from "@/lib/youtube"
import { NeonText } from "@/components/neon/neon-text"
import { getNeonColor, glowClasses, borderClasses, bgClasses, gradientViaClasses, cappedAnimationDelay } from "@/lib/neon-styles"

interface VideoListItemProps {
  video: YouTubeVideo
  index: number
  isMobile: boolean
  language: string
  isHovered: boolean
  isPlayButtonHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onPlayButtonMouseEnter: () => void
  onPlayButtonMouseLeave: () => void
}

export const VideoListItem = memo(function VideoListItem({
  video,
  index,
  isMobile,
  language,
  isHovered,
  isPlayButtonHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onPlayButtonMouseEnter,
  onPlayButtonMouseLeave,
}: VideoListItemProps) {
  const viewCountTag = getViewCountTag(video.viewCount || 0)
  const color = getNeonColor(index)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClick()
    } else if (e.key === " " || e.key === "Spacebar") {
      // Prevent the page from scrolling when activating via Space.
      e.preventDefault()
      onClick()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isMobile ? 0 : -50 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: isHovered ? 1.02 : 1,
        y: isHovered ? -4 : 0,
      }}
      transition={{
        delay: isMobile ? 0 : cappedAnimationDelay(index, 0.05),
        scale: { duration: 0.3, ease: "easeOut" },
        y: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.2 },
        x: { duration: 0.4, ease: "easeOut" },
      }}
      className={`relative w-full flex gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 border-2 ${borderClasses[color]} ${
        isHovered ? glowClasses[color] : ""
      } rounded-lg cursor-pointer transition-all duration-300 ease-out bg-vinyl-black/80 backdrop-blur-sm active:scale-98 ${
        isHovered ? "shadow-2xl" : "shadow-lg"
      } hover:border-opacity-100 ${isMobile ? "mx-0" : "mx-1"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* グロー効果 */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-transparent ${gradientViaClasses[color]} to-transparent rounded-lg transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-50"
        }`}
      />

      <div className={`relative flex-shrink-0 ${isMobile ? "w-[35%] max-w-[120px]" : "w-[30%] sm:w-[25%] max-w-[200px]"} z-10`}>
        <div className="aspect-video w-full overflow-hidden rounded-md relative">
          <Image
            src={video.thumbnailUrl || "/placeholder.svg?height=90&width=160"}
            alt={video.title}
            width={160}
            height={90}
            className="w-full h-full object-cover select-none rounded-md transition-transform duration-300"
            draggable={false}
          />
          {/* 再生ボタンオーバーレイ */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <motion.div
              animate={{
                scale: isPlayButtonHovered ? 1.2 : 1,
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              whileTap={{
                scale: 0.9,
                rotate: isMobile ? 0 : 360,
                transition: {
                  duration: isMobile ? 0.2 : 0.8,
                  ease: [0.4, 0, 0.2, 1],
                  type: "tween",
                },
              }}
              className={`${isMobile ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"} rounded-full ${bgClasses[color]} flex items-center justify-center ${glowClasses[color]} relative overflow-hidden`}
              onMouseEnter={onPlayButtonMouseEnter}
              onMouseLeave={onPlayButtonMouseLeave}
            >
              <motion.div
                initial={{ scale: 1 }}
                whileTap={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{ duration: isMobile ? 0.2 : 0.8 }}
                className="absolute inset-0 rounded-full bg-white/20"
              />
              {/* Decorative only: the whole row already exposes role="button" with
                  the video title as its accessible name, so this glyph is hidden
                  from assistive tech rather than duplicated with its own label. */}
              <span aria-hidden="true" className={`text-black ${isMobile ? "text-xs" : "text-sm sm:text-lg"} ml-0.5 relative z-10`}>
                ▶
              </span>
            </motion.div>
          </div>

          {/* 動画情報オーバーレイ（モバイル最適化） */}
          <div className={`absolute bottom-1 right-1 bg-black/80 text-white ${isMobile ? "text-xs px-1 py-0.5" : "text-xs px-1 py-0.5"} rounded`}>
            {formatDuration(video.duration)}
          </div>
          <div className={`absolute top-1 left-1 bg-black/80 text-white ${isMobile ? "text-xs px-1 py-0.5" : "text-xs px-2 py-1"} rounded-full`}>
            #{index + 1}
          </div>
          {video.isShort && (
            <div className={`absolute top-1 right-1 bg-red-500 text-white ${isMobile ? "text-xs px-1 py-0.5" : "text-xs px-2 py-0.5"} rounded-full`}>
              #shorts
            </div>
          )}
          {viewCountTag && (
            <div
              className={`absolute bottom-1 left-1 ${viewCountTag.color} text-xs px-2 py-0.5 rounded-full font-medium shadow-md`}
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
            </div>
          )}
        </div>
      </div>

      <div className={`flex-grow min-w-0 overflow-hidden relative z-10 ${isMobile ? "w-[65%]" : "w-[70%] sm:w-[75%]"}`}>
        <NeonText
          size="sm"
          color={color}
          className={`${isMobile ? "line-clamp-2 text-left mb-1 text-sm" : "line-clamp-2 text-left mb-2 sm:mb-3"}`}
          animate={false}
        >
          {video.title}
        </NeonText>
        <div className={`grid ${isMobile ? "grid-cols-2 gap-y-1" : "grid-cols-2 sm:grid-cols-3 gap-y-1 sm:gap-y-2"} ${isMobile ? "text-xs" : "text-xs sm:text-sm"} text-muted-foreground`}>
          <div className="flex items-center gap-1">
            <Eye className={`${isMobile ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"} flex-shrink-0`} />
            <span className="truncate">{formatNumber(video.viewCount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className={`${isMobile ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"} flex-shrink-0`} />
            <span className="truncate">{formatNumber(video.likeCount)}</span>
          </div>
          <div className={`flex items-center gap-1 ${isMobile ? "col-span-2" : "col-span-2 sm:col-span-1"}`}>
            <MessageSquare className={`${isMobile ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"} flex-shrink-0`} />
            <span className="truncate">{formatNumber(video.commentCount)}</span>
          </div>
          <div className={`flex items-center gap-1 ${isMobile ? "col-span-2 mt-0.5" : "col-span-2 sm:col-span-3 mt-1"}`}>
            <Clock className={`${isMobile ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"} flex-shrink-0`} />
            <span className="truncate">{formatDate(video.publishedAt, language)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
