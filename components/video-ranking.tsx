"use client"

import type React from "react"

import { useState, useMemo, useEffect, useRef } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  AlertCircle,
  Filter,
  X,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { type YouTubeVideo, formatNumber, formatDate, formatDuration, getViewCountTag } from "@/lib/youtube"
import VideoDetailDialog from "./video-detail-dialog"
import { NeonVideoCard } from "@/components/cards/neon-video-card"
import { NeonText } from "@/components/neon/neon-text"
import { useLanguage } from "@/lib/language-context"
import { useMediaQuery } from "@/hooks/use-media-query"

type SortField = "viewCount" | "likeCount" | "commentCount" | "publishedAt"
type SortOrder = "asc" | "desc"

interface VideoRankingProps {
  initialVideos: YouTubeVideo[]
}

export default function VideoRanking({ initialVideos }: VideoRankingProps) {
  const { t, language } = useLanguage()
  const [videos] = useState<YouTubeVideo[]>(initialVideos)
  const [sortField, setSortField] = useState<SortField>("viewCount")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [limitCount, setLimitCount] = useState<number>(100)
  const [excludeShorts, setExcludeShorts] = useState<boolean>(false)
  const [activeFilters, setActiveFilters] = useState<number>(0)
  const [clickedCardId, setClickedCardId] = useState<string | null>(null)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // フィルターメニューの参照を作成
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  // モバイル判定
  const isMobile = useMediaQuery("(max-width: 768px)")

  // 外側クリックを検出するためのイベントリスナーを設定
  useEffect(() => {
    // フィルターが開いていない場合は何もしない
    if (!filterSheetOpen || isMobile) return

    // クリックイベントのハンドラー
    const handleOutsideClick = (event: MouseEvent) => {
      // フィルターメニューと開閉ボタンの参照が存在し、
      // クリックがそれらの外側で発生した場合にフィルターを閉じる
      if (
        filterMenuRef.current &&
        filterButtonRef.current &&
        !filterMenuRef.current.contains(event.target as Node) &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        // セレクトボックスやその他のポップアップが開いていないことを確認
        // document.activeElementがbodyの場合のみフィルターを閉じる
        if (document.activeElement === document.body) {
          setFilterSheetOpen(false)
        }
      }
    }

    // イベントリスナーを追加（mousedownではなくmouseupを使用）
    document.addEventListener("mouseup", handleOutsideClick)

    // クリーンアップ関数
    return () => {
      document.removeEventListener("mouseup", handleOutsideClick)
    }
  }, [filterSheetOpen, isMobile])

  // 右クリックを防止する関数
  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  // 利用可能な年のリストを取得
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    videos.forEach((video) => {
      const year = new Date(video.publishedAt).getFullYear().toString()
      years.add(year)
    })
    return Array.from(years).sort((a, b) => Number.parseInt(b) - Number.parseInt(a)) // 降順でソート
  }, [videos])

  // フィルタリングされた動画
  const filteredVideos = useMemo(() => {
    let filtered = videos

    // タイトル検索
    if (searchQuery) {
      filtered = filtered.filter((video) => video.title.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // 年フィルター
    if (yearFilter !== "all") {
      filtered = filtered.filter((video) => {
        const videoYear = new Date(video.publishedAt).getFullYear().toString()
        return videoYear === yearFilter
      })
    }

    // ショート動画除外フィルター
    if (excludeShorts) {
      filtered = filtered.filter((video) => !video.isShort)
    }

    return filtered
  }, [videos, searchQuery, yearFilter, excludeShorts])

  // ソートされた動画
  const sortedVideos = useMemo(() => {
    const sorted = [...filteredVideos].sort((a, b) => {
      if (sortField === "publishedAt") {
        const dateA = new Date(a[sortField]).getTime()
        const dateB = new Date(b[sortField]).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }

      return sortOrder === "asc" ? a[sortField] - b[sortField] : b[sortField] - a[sortField]
    })

    // 表示件数制限
    return sorted.slice(0, limitCount)
  }, [filteredVideos, sortField, sortOrder, limitCount])

  // アクティブなフィルター数を更新
  useEffect(() => {
    let count = 0
    if (yearFilter !== "all") count++
    if (limitCount !== 100) count++
    if (searchQuery) count++
    if (excludeShorts) count++
    setActiveFilters(count)
  }, [yearFilter, limitCount, searchQuery, excludeShorts])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const handleVideoClick = (video: YouTubeVideo) => {
    // クリックアニメーションのためにIDを設定
    setClickedCardId(video.id)

    // アニメーション完了後にダイアログを表示
    setTimeout(() => {
      setSelectedVideo(video)
      setClickedCardId(null)
    }, 300)
  }

  const closeDialog = () => {
    setSelectedVideo(null)
  }

  const resetFilters = () => {
    setYearFilter("all")
    setLimitCount(100)
    setSearchQuery("")
    setExcludeShorts(false)
    // モバイルの場合はシートを閉じる
    if (isMobile) {
      setFilterSheetOpen(false)
    }
  }

  // フィルター設定UI
  const FilterControls = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("publishYear")}</h4>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("publishYear")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allYears")}</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
                {t("year")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("displayCount")}</h4>
        <Select value={limitCount.toString()} onValueChange={(value) => setLimitCount(Number.parseInt(value))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("displayCount")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">
              {t("top")}10{t("items")}
            </SelectItem>
            <SelectItem value="20">
              {t("top")}20{t("items")}
            </SelectItem>
            <SelectItem value="50">
              {t("top")}50{t("items")}
            </SelectItem>
            <SelectItem value="100">
              {t("top")}100{t("items")}
            </SelectItem>
            <SelectItem value="200">
              {t("top")}200{t("items")}
            </SelectItem>
            <SelectItem value="500">
              {t("top")}500{t("items")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("contentType")}</h4>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exclude-shorts"
            checked={excludeShorts}
            onCheckedChange={(checked) => setExcludeShorts(!!checked)}
          />
          <label
            htmlFor="exclude-shorts"
            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("excludeShorts")}
          </label>
        </div>
      </div>
    </div>
  )

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">{t("noVideos")}</h3>
        <p className="text-muted-foreground max-w-md">{t("apiError")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />

          {isMobile ? (
            // モバイル向けのシートコンポーネント
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("filterButton")}
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("filterSettings")}</SheetTitle>
                  <SheetDescription>{t("filterButton")}</SheetDescription>
                </SheetHeader>
                <div className="py-6">
                  <FilterControls />
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={resetFilters} className="w-full">
                    {t("resetFilters")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : (
            // デスクトップ向けのドロップダウンメニュー
            <div className="relative">
              <Button
                ref={filterButtonRef}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setFilterSheetOpen(!filterSheetOpen)}
              >
                <Filter className="h-4 w-4" />
                {t("filterButton")}
                {activeFilters > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilters}
                  </Badge>
                )}
              </Button>
              {filterSheetOpen && (
                <div ref={filterMenuRef} className="absolute z-50 mt-2 w-72 rounded-md shadow-lg bg-background border">
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{t("filterSettings")}</h3>
                      <Button variant="ghost" size="sm" onClick={() => setFilterSheetOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <FilterControls />
                    <Button variant="outline" onClick={resetFilters} className="w-full">
                      {t("resetFilters")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 sm:mt-0">
              {yearFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 flex items-center">
                  {yearFilter}
                  {t("year")}
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setYearFilter("all")}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {limitCount !== 100 && (
                <Badge variant="secondary" className="gap-1 flex items-center">
                  {t("top")}
                  {limitCount}
                  {t("items")}
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setLimitCount(100)}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {excludeShorts && (
                <Badge variant="secondary" className="gap-1 flex items-center">
                  {t("excludeShorts")}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setExcludeShorts(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1 flex items-center">
                  "{searchQuery}"
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setSearchQuery("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">{t("sortBy")}</span>
          <Select value={sortField} onValueChange={(value) => handleSort(value as SortField)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewCount">{t("viewCount")}</SelectItem>
              <SelectItem value="likeCount">{t("likeCount")}</SelectItem>
              <SelectItem value="commentCount">{t("commentCount")}</SelectItem>
              <SelectItem value="publishedAt">{t("publishedAt")}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            aria-label={sortOrder === "asc" ? "昇順" : "降順"}
            className="active:scale-90 transition-transform"
          >
            {sortOrder === "asc" ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredVideos.length}
          {t("displayingVideos")} {Math.min(sortedVideos.length, limitCount)}
          {t("displaying")}
        </p>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-xl font-medium mb-2">{t("noResults")}</h3>
          <p className="text-muted-foreground">{t("tryDifferent")}</p>
          <Button
            variant="outline"
            className="mt-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            onClick={resetFilters}
          >
            {t("resetFilters")}
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="grid" className="transition-transform active:scale-95">
              {t("gridView")}
            </TabsTrigger>
            <TabsTrigger value="list" className="transition-transform active:scale-95">
              {t("listView")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="w-full">
            {/* ネオンカードを使用したグリッドレイアウト */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {sortedVideos.map((video, index) => {
                // YouTubeVideoをNeonVideoCardが期待する形式に変換
                const neonVideo = {
                  id: video.id,
                  title: video.title,
                  thumbnail: video.thumbnailUrl || "/placeholder.svg?height=180&width=320",
                  viewCount: video.viewCount,
                  likeCount: video.likeCount,
                  commentCount: video.commentCount,
                  popularityScore: Math.min(video.viewCount / 10000000, 1), // 1000万再生を最大値として正規化
                  publishedAt: video.publishedAt
                }

                return (
                  <NeonVideoCard
                    key={video.id}
                    video={neonVideo}
                    index={index}
                    onClick={() => handleVideoClick(video)}
                  />
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="w-full">
            <div className="space-y-3 md:space-y-4">
              {sortedVideos.map((video, index) => {
                const viewCountTag = getViewCountTag(video.viewCount)
                const neonColors = ['pink', 'cyan', 'green', 'purple', 'orange'] as const
                const color = neonColors[index % neonColors.length]
                
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
                    key={video.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ 
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    className={`flex gap-2 sm:gap-4 p-2 sm:p-3 border-2 ${borderClasses[color]} ${glowClasses[color]} rounded-lg cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-vinyl-black/80 backdrop-blur-sm active:scale-98 ${
                      clickedCardId === video.id ? "click-animation" : ""
                    }`}
                    onClick={() => handleVideoClick(video)}
                    onContextMenu={preventContextMenu}
                  >
                    {/* グロー効果 */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${color}/10 to-transparent rounded-lg`} />
                    
                    <div className="relative flex-shrink-0 w-[120px] sm:w-[160px] z-10">
                      <div className="aspect-video w-full overflow-hidden rounded-md">
                        <Image
                          src={video.thumbnailUrl || "/placeholder.svg?height=90&width=160"}
                          alt={video.title}
                          width={160}
                          height={90}
                          className="w-full h-full object-cover select-none rounded-md"
                          onContextMenu={preventContextMenu}
                          draggable={false}
                        />
                        {/* 再生ボタンオーバーレイ */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                          <motion.div
                            whileHover={{ scale: 1.2 }}
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
                            className={`w-12 h-12 rounded-full ${bgClasses[color]} flex items-center justify-center ${glowClasses[color]} relative overflow-hidden`}
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
                            <span className="text-black text-lg ml-0.5 relative z-10">▶</span>
                          </motion.div>
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                        {formatDuration(video.duration)}
                      </div>
                      <div className="absolute top-1 left-1 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
                        #{index + 1}
                      </div>
                      {video.isShort && (
                        <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
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
                    <div className="flex-grow min-w-0 overflow-hidden relative z-10">
                      <NeonText size="sm" color={color} className="line-clamp-2 text-left mb-2" animate={false}>
                        {video.title}
                      </NeonText>
                      <div className="grid grid-cols-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{formatNumber(video.viewCount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{formatNumber(video.likeCount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{formatNumber(video.commentCount)}</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-3 mt-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{formatDate(video.publishedAt, language)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {selectedVideo && <VideoDetailDialog video={selectedVideo} onClose={closeDialog} />}
    </div>
  )
}
