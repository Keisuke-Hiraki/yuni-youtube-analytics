'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Card } from '../ui/card'
import { NeonText } from '@/components/neon/neon-text'
import { Eye, ThumbsUp, MessageSquare, Clock } from 'lucide-react'
import { formatNumber, formatDate, formatDuration, getViewCountTag } from '@/lib/youtube'
import { useLanguage } from '@/lib/language-context'
import Image from 'next/image'

interface Video {
  id: string
  title: string
  thumbnail: string
  viewCount?: number
  likeCount?: number
  commentCount?: number
  popularityScore?: number
  publishedAt?: string
  duration?: string
  isShort?: boolean
}

interface NeonVideoCardProps {
  video: Video
  index: number
  onClick?: () => void
}

export const NeonVideoCard = ({ video, index, onClick }: NeonVideoCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlayButtonHovered, setIsPlayButtonHovered] = useState(false)
  const { language } = useLanguage()
  
  const neonColors = ['pink', 'cyan', 'green', 'purple', 'orange'] as const
  const color = neonColors[index % neonColors.length]
  const viewCountTag = getViewCountTag(video.viewCount || 0)

  const glowClasses = {
    pink: 'neon-glow-pink',
    cyan: 'neon-glow-cyan',
    green: 'neon-glow-green',
    purple: 'neon-glow-purple',
    orange: 'shadow-lg shadow-neon-orange/20'
  }

  const borderClasses = {
    pink: 'border-neon-pink',
    cyan: 'border-neon-cyan',
    green: 'border-neon-green',
    purple: 'border-neon-purple',
    orange: 'border-neon-orange'
  }

  const bgClasses = {
    pink: 'bg-neon-pink',
    cyan: 'bg-neon-cyan',
    green: 'bg-neon-green',
    purple: 'bg-neon-purple',
    orange: 'bg-neon-orange'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isHovered ? 1.05 : 1
      }}
      transition={{
        delay: index * 0.1,
        scale: { duration: 0.2, ease: "easeInOut" },
        opacity: { duration: 0.3 },
        y: { duration: 0.3 }
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer"
    >
      <Card className={`
        relative overflow-hidden bg-vinyl-black/80 backdrop-blur-sm
        border-2 ${borderClasses[color]} ${isHovered ? glowClasses[color] : ''}
        transition-all duration-300 ease-in-out
        ${isHovered ? 'shadow-2xl' : 'shadow-lg'}
      `}>
        {/* グロー効果 */}
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${color}/10 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-50'}`} />
        
        {/* サムネイル */}
        <div className="relative">
          <Image 
            src={video.thumbnail} 
            alt={video.title}
            width={320}
            height={180}
            className="w-full h-48 object-cover transition-transform duration-300"
          />
          
          {/* 再生ボタンオーバーレイ */}
          <div 
            className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            onMouseEnter={() => setIsPlayButtonHovered(true)}
            onMouseLeave={() => setIsPlayButtonHovered(false)}
          >
            <motion.div
              animate={{
                scale: isPlayButtonHovered ? 1.2 : 1
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              whileTap={{ 
                scale: 0.9,
                rotate: 360,
                transition: { 
                  duration: 0.6, 
                  ease: "easeInOut",
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }
              }}
              className={`w-16 h-16 rounded-full ${bgClasses[color]} flex items-center justify-center ${glowClasses[color]} relative overflow-hidden`}
            >
              <motion.div
                initial={{ scale: 1 }}
                whileTap={{ 
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-full bg-white/20"
              />
              <span className="text-black text-2xl ml-1 relative z-10">▶</span>
            </motion.div>
          </div>

          {/* 動画情報オーバーレイ */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
          
          <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
            #{index + 1}
          </div>
          
          {video.isShort && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              #shorts
            </div>
          )}
          
          {viewCountTag && (
            <div
              className={`absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full font-medium shadow-md`}
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

        {/* コンテンツ */}
        <div className="p-4 space-y-3">
          <NeonText size="sm" color={color} className="line-clamp-2 text-left" animate={false}>
            {video.title}
          </NeonText>
          
          {/* 統計情報（アイコン付き） */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{formatNumber(video.viewCount || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{formatNumber(video.likeCount || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{formatNumber(video.commentCount || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{video.publishedAt ? formatDate(video.publishedAt, language) : ''}</span>
            </div>
          </div>

          {/* プログレスバー（人気度） */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${bgClasses[color]}`}
              initial={{ width: 0 }}
              animate={{ width: `${(video.popularityScore || 0) * 100}%` }}
              transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
              style={{
                filter: `drop-shadow(0 0 5px var(--neon-${color}))`
              }}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  )
} 