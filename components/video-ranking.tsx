"use client"

import type React from "react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import {
  AlertCircle,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
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
import { type YouTubeVideo } from "@/lib/youtube"
import VideoDetailDialog from "./video-detail-dialog"
import { NeonVideoCard } from "@/components/cards/neon-video-card"
import { VideoListItem } from "@/components/cards/video-list-item"
import { useLanguage } from "@/lib/language-context"
import { useMediaQuery } from "@/hooks/use-media-query"

// ソートタイプの定義
type SortField = "default" | "viewCount" | "likeCount" | "commentCount" | "publishedAt"
type SortOrder = "asc" | "desc"

interface VideoRankingProps {
  initialVideos: YouTubeVideo[]
}

// 独立したソートコントロール（モジュールトップレベルに抽出し、親の再レンダリングごとに
// 新しいコンポーネント型が生成されて Select 等が再マウントされる問題を回避する）
interface SortControlsProps {
  t: (key: string) => string
  isMobile: boolean
  sortField: SortField
  setSortField: (field: SortField) => void
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => void
}

function SortControls({ t, isMobile, sortField, setSortField, sortOrder, setSortOrder }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
        <SelectTrigger className={isMobile ? "w-full" : "w-48"}>
          <SelectValue placeholder={t("sortBy")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t("defaultSort")}</SelectItem>
          <SelectItem value="viewCount">{t("sortByViewCount")}</SelectItem>
          <SelectItem value="likeCount">{t("sortByLikeCount")}</SelectItem>
          <SelectItem value="commentCount">{t("sortByCommentCount")}</SelectItem>
          <SelectItem value="publishedAt">{t("sortByPublishedAt")}</SelectItem>
        </SelectContent>
      </Select>
      {sortField !== "default" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3"
            title={sortOrder === "asc" ? t("sortOrderDesc") : t("sortOrderAsc")}
          >
            {sortOrder === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSortField("default")
              setSortOrder("desc")
            }}
            className="px-2"
            title={t("resetSort")}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}

// フィルター設定UI（モジュールトップレベルに抽出）
interface FilterControlsProps {
  t: (key: string) => string
  availableYears: string[]
  yearFilter: string
  setYearFilter: (year: string) => void
  limitCount: number
  setLimitCount: (count: number) => void
  excludeShorts: boolean
  setExcludeShorts: (exclude: boolean) => void
}

function FilterControls({
  t,
  availableYears,
  yearFilter,
  setYearFilter,
  limitCount,
  setLimitCount,
  excludeShorts,
  setExcludeShorts,
}: FilterControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("publishYear")}</h4>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("publishYear")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allYears")}</SelectItem>
            {availableYears && Array.isArray(availableYears) ? availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
                {t("year")}
              </SelectItem>
            )) : null}
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
}

export default function VideoRanking({ initialVideos }: VideoRankingProps) {
  const { t, language } = useLanguage()
  const [videos] = useState<YouTubeVideo[]>(initialVideos || [])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [limitCount, setLimitCount] = useState<number>(100)
  const [excludeShorts, setExcludeShorts] = useState<boolean>(false)

  // ソート機能のstate追加
  const [sortField, setSortField] = useState<SortField>("default")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  const [activeFilters, setActiveFilters] = useState<number>(0)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [hoveredPlayButtonId, setHoveredPlayButtonId] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const listContainerRef = useRef<HTMLDivElement>(null)

  // モバイル判定
  const isMobile = useMediaQuery("(max-width: 768px)")

  // コンポーネントのクリーンアップ時にタイムアウトをクリア
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // ソート関数の定義
  const sortVideos = (videos: YouTubeVideo[], field: SortField, order: SortOrder): YouTubeVideo[] => {
    if (field === "default") {
      return videos // デフォルトの順序を保持
    }

    return [...videos].sort((a, b) => {
      let valueA: number | string
      let valueB: number | string

      switch (field) {
        case "viewCount":
          valueA = a.viewCount || 0
          valueB = b.viewCount || 0
          break
        case "likeCount":
          valueA = a.likeCount || 0
          valueB = b.likeCount || 0
          break
        case "commentCount":
          valueA = a.commentCount || 0
          valueB = b.commentCount || 0
          break
        case "publishedAt":
          valueA = new Date(a.publishedAt).getTime()
          valueB = new Date(b.publishedAt).getTime()
          break
        default:
          return 0
      }

      if (order === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0
      }
    })
  }

  // 利用可能な年のリストを取得
  const availableYears = useMemo(() => {
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return []
    }
    const years = new Set<string>()
    videos.forEach((video) => {
      if (video && video.publishedAt) {
        try {
          const year = new Date(video.publishedAt).getFullYear().toString()
          years.add(year)
        } catch (error) {
          console.error('Invalid date format:', video.publishedAt, error)
        }
      }
    })
    return Array.from(years).sort((a, b) => Number.parseInt(b) - Number.parseInt(a)) // 降順でソート
  }, [videos])

  // フィルタリング＋ソート済みの動画（表示件数制限を適用する前の全件）
  // 表示件数のカウント表示にも再利用し、JSX内での二重フィルタ計算を避ける
  const filteredAndSortedVideos = useMemo(() => {
    if (!videos || !Array.isArray(videos)) {
      return []
    }
    let filtered = videos

    // タイトル検索
    if (searchQuery) {
      filtered = filtered.filter((video) => video && video.title && video.title.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // 年フィルター
    if (yearFilter !== "all") {
      filtered = filtered.filter((video) => {
        if (!video || !video.publishedAt) return false
        try {
          const videoYear = new Date(video.publishedAt).getFullYear().toString()
          return videoYear === yearFilter
        } catch (error) {
          console.error('Invalid date format during filtering:', video.publishedAt, error)
          return false
        }
      })
    }

    // ショート動画除外フィルター
    if (excludeShorts) {
      filtered = filtered.filter((video) => video && !video.isShort)
    }

    // ソート適用
    return sortVideos(filtered, sortField, sortOrder)
  }, [videos, searchQuery, yearFilter, excludeShorts, sortField, sortOrder])

  // 表示件数制限を適用した最終的な動画リスト
  const filteredVideos = useMemo(() => {
    return filteredAndSortedVideos.slice(0, limitCount)
  }, [filteredAndSortedVideos, limitCount])

  // YouTubeVideo を NeonVideoCard が期待する形式に変換したリスト。
  // useMemo で filteredVideos が変わらない限り同じ配列（＝同じオブジェクト参照）を
  // 返すため、NeonVideoCard に渡す video prop が親の再レンダリングごとに
  // 再生成されず、React.memo によるスキップが有効になる。
  const neonVideos = useMemo(() => {
    return filteredVideos
      .filter((video): video is YouTubeVideo => !!(video && video.id))
      .map((video) => ({
        id: video.id,
        title: video.title || '',
        thumbnail: video.thumbnailUrl || "/placeholder.svg?height=180&width=320",
        viewCount: video.viewCount || 0,
        likeCount: video.likeCount || 0,
        commentCount: video.commentCount || 0,
        popularityScore: Math.min((video.viewCount || 0) / 10000000, 1), // 1000万再生を最大値として正規化
        publishedAt: video.publishedAt || '',
        duration: video.duration || '',
        isShort: video.isShort || false,
      }))
  }, [filteredVideos])

  // アクティブなフィルター数を更新（ソート条件は除外）
  useEffect(() => {
    let count = 0
    if (yearFilter !== "all") count++
    if (limitCount !== 100) count++
    if (searchQuery) count++
    if (excludeShorts) count++
    setActiveFilters(count)
  }, [yearFilter, limitCount, searchQuery, excludeShorts])

  // useCallback で安定した参照を保つ（setSelectedVideo は useState のセッターで
  // 常に同一参照のため、依存配列は空でよい）。これにより VideoListItem に渡す
  // onSelect prop の参照が親の再レンダリングを跨いで変化せず、React.memo が機能する。
  const handleVideoClick = useCallback((video: YouTubeVideo) => {
    // ダイアログを即時表示（以前はクリックアニメーションのため300msの遅延があった）
    setSelectedVideo(video)
  }, [])

  // NeonVideoCard は表示用に変換された neonVideo（id のみ共通）を持つため、
  // id を受け取って元の YouTubeVideo を filteredVideos から検索してから
  // handleVideoClick に渡す。filteredVideos は useMemo で安定しているため、
  // 実際にリストが変わらない限りこの関数の参照も変化しない。
  const handleNeonCardSelect = useCallback((id: string) => {
    const video = filteredVideos.find((v) => v && v.id === id)
    if (video) {
      handleVideoClick(video)
    }
  }, [filteredVideos, handleVideoClick])

  const handleItemMouseEnter = useCallback((id: string) => {
    // 既存のタイムアウトをクリア（hoverTimeoutRef は ref なので参照は不変）
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredItemId(id)
  }, [])

  const handleItemMouseLeave = useCallback(() => {
    // 少し遅延させてホバー状態をクリア（安定性向上）
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItemId(null)
      setHoveredPlayButtonId(null)
    }, 100)
  }, [])

  const handlePlayButtonMouseEnter = useCallback((id: string) => {
    // 既存のタイムアウトをクリア
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredPlayButtonId(id)
  }, [])

  const handlePlayButtonMouseLeave = useCallback(() => {
    // 再生ボタンから離れた時は即座にクリア
    setHoveredPlayButtonId(null)
  }, [])

  const closeDialog = () => {
    setSelectedVideo(null)
  }

  const resetFilters = () => {
    setYearFilter("all")
    setLimitCount(100)
    setSearchQuery("")
    setExcludeShorts(false)
    // ソート条件はリセットしない
    // モバイルの場合はシートを閉じる
    if (isMobile) {
      setFilterSheetOpen(false)
    }
  }

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
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-col sm:flex-row gap-4'} items-start sm:items-center justify-between`}>
        <div className={`flex ${isMobile ? 'flex-col gap-2 w-full' : 'flex-wrap gap-2 items-center w-full sm:w-auto'}`}>
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={isMobile ? "w-full" : "max-w-xs"}
          />

          {isMobile ? (
            // モバイル向けのシートコンポーネント
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-full justify-center">
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
                  <FilterControls
                    t={t}
                    availableYears={availableYears}
                    yearFilter={yearFilter}
                    setYearFilter={setYearFilter}
                    limitCount={limitCount}
                    setLimitCount={setLimitCount}
                    excludeShorts={excludeShorts}
                    setExcludeShorts={setExcludeShorts}
                  />
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={resetFilters} className="w-full">
                    {t("resetFilters")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : (
            // デスクトップ向けの Popover（Radix ベース。以前の document.activeElement 依存の
            // 脆弱な外側クリック検出を置き換え、フォーカス管理・Escape・外側クリックを標準委譲する）
            <PopoverPrimitive.Root open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <PopoverPrimitive.Trigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t("filterButton")}
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 w-72 rounded-md shadow-lg bg-background border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                >
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{t("filterSettings")}</h3>
                      <Button variant="ghost" size="sm" onClick={() => setFilterSheetOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <FilterControls
                      t={t}
                      availableYears={availableYears}
                      yearFilter={yearFilter}
                      setYearFilter={setYearFilter}
                      limitCount={limitCount}
                      setLimitCount={setLimitCount}
                      excludeShorts={excludeShorts}
                      setExcludeShorts={setExcludeShorts}
                    />
                    <Button variant="outline" onClick={resetFilters} className="w-full">
                      {t("resetFilters")}
                    </Button>
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          )}

          {activeFilters > 0 && (
            <div className={`flex ${isMobile ? 'flex-col gap-1 w-full mt-2' : 'flex-wrap gap-1 mt-2 sm:mt-0'}`}>
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
                  &quot;{searchQuery}&quot;
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setSearchQuery("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* 右側にソートコントロールを配置 */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("sortBy")}:</span>
            <SortControls
              t={t}
              isMobile={isMobile}
              sortField={sortField}
              setSortField={setSortField}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          </div>
        )}
      </div>

      {/* モバイル用のソートコントロール */}
      {isMobile && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{t("sortBy")}:</span>
          <SortControls
            t={t}
            isMobile={isMobile}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedVideos.length}
          {t("displayingVideos")} {filteredVideos.length}
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
          <TabsList className={`mb-4 ${isMobile ? 'w-full' : ''}`}>
            <TabsTrigger value="grid" className={`transition-transform active:scale-95 ${isMobile ? 'flex-1' : ''}`}>
              {isMobile ? t("grid") : t("gridView")}
            </TabsTrigger>
            <TabsTrigger value="list" className={`transition-transform active:scale-95 ${isMobile ? 'flex-1' : ''}`}>
              {isMobile ? t("list") : t("listView")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="w-full">
            {/* ネオンカードを使用したグリッドレイアウト（モバイル最適化） */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8'}`}>
              {neonVideos.map((neonVideo, index) => (
                <NeonVideoCard
                  key={neonVideo.id}
                  video={neonVideo}
                  index={index}
                  onSelect={handleNeonCardSelect}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list" className="w-full">
            <div
              ref={listContainerRef}
              className={`space-y-2 sm:space-y-3 md:space-y-4 w-full ${isMobile ? 'px-1' : 'px-2'}`}
            >
              {filteredVideos && Array.isArray(filteredVideos) ? filteredVideos.map((video, index) => {
                if (!video || !video.id) return null

                return (
                  <VideoListItem
                    key={video.id}
                    video={video}
                    index={index}
                    isMobile={isMobile}
                    language={language}
                    isHovered={hoveredItemId === video.id}
                    isPlayButtonHovered={hoveredPlayButtonId === video.id}
                    onSelect={handleVideoClick}
                    onItemMouseEnter={handleItemMouseEnter}
                    onItemMouseLeave={handleItemMouseLeave}
                    onPlayButtonMouseEnter={handlePlayButtonMouseEnter}
                    onPlayButtonMouseLeave={handlePlayButtonMouseLeave}
                  />
                )
              }).filter(Boolean) : null}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {selectedVideo && <VideoDetailDialog video={selectedVideo} onClose={closeDialog} />}
    </div>
  )
}
