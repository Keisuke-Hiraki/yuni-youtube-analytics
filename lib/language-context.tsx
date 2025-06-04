"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "ja" | "en" | "zh" | "ko"

type Translations = {
  [key in Language]: {
    [key: string]: string
  }
}

// サイト名（翻訳されない固定値）
export const SITE_TITLE = "YuNi Stellar Chart - Alpha ver."

// 翻訳データ
export const translations: Translations = {
  ja: {
    siteDescription: "YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング",
    videosAnalyzed: "動画分析数",
    lastUpdated: "最終更新",
    searchPlaceholder: "動画を検索...",
    filterButton: "フィルター",
    sortBy: "並び替え:",
    viewCount: "再生回数",
    likeCount: "いいね数",
    commentCount: "コメント数",
    publishedAt: "投稿日",
    displayingVideos: "件中",
    displaying: "件表示",
    noResults: "検索結果が見つかりませんでした",
    tryDifferent: "検索条件を変更してお試しください。",
    resetFilters: "フィルターをリセット",
    gridView: "グリッド表示",
    listView: "リスト表示",
    filterSettings: "フィルター設定",
    publishYear: "投稿年",
    allYears: "すべての年",
    year: "年",
    displayCount: "表示件数",
    top: "上位",
    items: "件",
    contentType: "コンテンツタイプ",
    excludeShorts: "ショート動画を除外",
    description: "説明",
    viewOnYouTube: "YouTubeで見る",
    loading: "動画データを読み込み中...",
    pleaseWait: "しばらくお待ちください",
    noVideos: "動画が見つかりませんでした",
    apiError: "YouTube APIからの動画データの取得に問題が発生しました。しばらく経ってから再度お試しください。",
    refreshData: "最新データに更新",
    refreshing: "更新中...",
    updateComplete: "更新完了",
    updateError: "更新エラー",
    error: "エラー",
    updateErrorMessage: "データの更新中にエラーが発生しました",
    refreshLimited: "更新制限",
    secondsRemaining: "秒後に再試行可能",
    fetchingData: "データを取得中",
    processingData: "データを処理中",
    // メタデータ関連
    metadata: "メタデータ",
    duration: "動画の長さ",
    thumbnailUrl: "サムネイルURL",
    copied: "コピーしました",
    copiedToClipboard: "をクリップボードにコピーしました",
    copyAllMetadata: "すべてのメタデータをコピー",
    allMetadata: "すべてのメタデータ",
    // チャンネル情報関連
    subscribers: "チャンネル登録者数",
    totalViews: "総再生回数",
    totalVideos: "総動画数",
  },
  en: {
    siteDescription: "Ranking YuNi's video performances by popularity, engagement, and views",
    videosAnalyzed: "Videos analyzed",
    lastUpdated: "Last updated",
    searchPlaceholder: "Search videos...",
    filterButton: "Filter",
    sortBy: "Sort by:",
    viewCount: "Views",
    likeCount: "Likes",
    commentCount: "Comments",
    publishedAt: "Upload date",
    displayingVideos: "of",
    displaying: "displayed",
    noResults: "No search results found",
    tryDifferent: "Try changing your search criteria.",
    resetFilters: "Reset Filters",
    gridView: "Grid View",
    listView: "List View",
    filterSettings: "Filter Settings",
    publishYear: "Publication Year",
    allYears: "All Years",
    year: "year",
    displayCount: "Display Count",
    top: "Top",
    items: "items",
    contentType: "Content Type",
    excludeShorts: "Exclude Shorts",
    description: "Description",
    viewOnYouTube: "View on YouTube",
    loading: "Loading video data...",
    pleaseWait: "Please wait",
    noVideos: "No videos found",
    apiError: "There was a problem retrieving video data from the YouTube API. Please try again later.",
    refreshData: "Refresh Data",
    refreshing: "Refreshing...",
    updateComplete: "Update Complete",
    updateError: "Update Error",
    error: "Error",
    updateErrorMessage: "An error occurred while updating the data",
    refreshLimited: "Refresh Limited",
    secondsRemaining: "s remaining",
    fetchingData: "Fetching data",
    processingData: "Processing data",
    // メタデータ関連
    metadata: "Metadata",
    duration: "Duration",
    thumbnailUrl: "Thumbnail URL",
    copied: "Copied",
    copiedToClipboard: " copied to clipboard",
    copyAllMetadata: "Copy All Metadata",
    allMetadata: "All Metadata",
    // チャンネル情報関連
    subscribers: "Subscribers",
    totalViews: "Total Views",
    totalVideos: "Total Videos",
  },
  zh: {
    siteDescription: "按人气、互动和观看次数对YuNi的视频表现进行排名",
    videosAnalyzed: "已分析视频",
    lastUpdated: "最后更新",
    searchPlaceholder: "搜索视频...",
    filterButton: "筛选",
    sortBy: "排序方式：",
    viewCount: "观看次数",
    likeCount: "点赞数",
    commentCount: "评论数",
    publishedAt: "上传日期",
    displayingVideos: "共",
    displaying: "显示",
    noResults: "未找到搜索结果",
    tryDifferent: "尝试更改搜索条件。",
    resetFilters: "重置筛选",
    gridView: "网格视图",
    listView: "列表视图",
    filterSettings: "筛选设置",
    publishYear: "发布年份",
    allYears: "所有年份",
    year: "年",
    displayCount: "显示数量",
    top: "前",
    items: "项",
    contentType: "内容类型",
    excludeShorts: "排除短视频",
    description: "描述",
    viewOnYouTube: "在YouTube上观看",
    loading: "正在加载视频数据...",
    pleaseWait: "请稍候",
    noVideos: "未找到视频",
    apiError: "从YouTube API检索视频数据时出现问题。请稍后再试。",
    refreshData: "刷新数据",
    refreshing: "刷新中...",
    updateComplete: "更新完成",
    updateError: "更新错误",
    error: "错误",
    updateErrorMessage: "更新数据时发生错误",
    refreshLimited: "刷新限制",
    secondsRemaining: "秒后可再次刷新",
    fetchingData: "获取数据中",
    processingData: "处理数据中",
    // メタデータ関連
    metadata: "元数据",
    duration: "时长",
    thumbnailUrl: "缩略图URL",
    copied: "已复制",
    copiedToClipboard: "已复制到剪贴板",
    copyAllMetadata: "复制所有元数据",
    allMetadata: "所有元数据",
    // チャンネル情報関連
    subscribers: "订阅者",
    totalViews: "总观看量",
    totalVideos: "视频总数",
  },
  ko: {
    siteDescription: "인기도, 참여도, 조회수별 YuNi의 비디오 퍼포먼스 순위",
    videosAnalyzed: "분석된 동영상",
    lastUpdated: "마지막 업데이트",
    searchPlaceholder: "동영상 검색...",
    filterButton: "필터",
    sortBy: "정렬 기준:",
    viewCount: "조회수",
    likeCount: "좋아요 수",
    commentCount: "댓글 수",
    publishedAt: "업로드 날짜",
    displayingVideos: "중",
    displaying: "표시됨",
    noResults: "검색 결과가 없습니다",
    tryDifferent: "검색 조건을 변경해 보세요.",
    resetFilters: "필터 초기화",
    gridView: "그리드 보기",
    listView: "목록 보기",
    filterSettings: "필터 설정",
    publishYear: "게시 연도",
    allYears: "모든 연도",
    year: "년",
    displayCount: "표시 개수",
    top: "상위",
    items: "개",
    contentType: "콘텐츠 유형",
    excludeShorts: "쇼츠 제외",
    description: "설명",
    viewOnYouTube: "YouTube에서 보기",
    loading: "동영상 데이터 로딩 중...",
    pleaseWait: "잠시만 기다려주세요",
    noVideos: "동영상을 찾을 수 없습니다",
    apiError: "YouTube API에서 동영상 데이터를 검색하는 데 문제가 발생했습니다. 나중에 다시 시도해 주세요.",
    refreshData: "데이터 새로고침",
    refreshing: "새로고침 중...",
    updateComplete: "업데이트 완료",
    updateError: "업데이트 오류",
    error: "오류",
    updateErrorMessage: "데이터를 업데이트하는 동안 오류가 발생했습니다",
    refreshLimited: "새로고침 제한",
    secondsRemaining: "초 후 다시 시도 가능",
    fetchingData: "데이터 가져오는 중",
    processingData: "데이터 처리 중",
    // メタデータ関連
    metadata: "메타데이터",
    duration: "재생 시간",
    thumbnailUrl: "썸네일 URL",
    copied: "복사됨",
    copiedToClipboard: " 클립보드에 복사됨",
    copyAllMetadata: "모든 메타데이터 복사",
    allMetadata: "모든 메타데이터",
    // チャンネル情報関連
    subscribers: "구독자",
    totalViews: "총 조회수",
    totalVideos: "총 동영상 수",
  },
}

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ja")

  // ブラウザのローカルストレージから言語設定を読み込む
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && ["ja", "en", "zh", "ko"].includes(savedLanguage)) {
      setLanguage(savedLanguage)
    }
  }, [])

  // 言語設定が変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem("language", language)
  }, [language])

  // 翻訳関数
  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

// カスタムフック
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
