"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { refreshVideoData } from "@/app/actions"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"

// 更新間隔（ミリ秒）
const REFRESH_COOLDOWN = 60000 // 1分
// データ取得の推定時間（ミリ秒）
const ESTIMATED_FETCH_TIME = 10000 // 10秒

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useLanguage()

  // コンポーネントマウント時に前回の更新時間をチェック
  useEffect(() => {
    const lastRefreshTime = localStorage.getItem("lastRefreshTime")
    if (lastRefreshTime) {
      const elapsed = Date.now() - Number(lastRefreshTime)
      if (elapsed < REFRESH_COOLDOWN) {
        setIsDisabled(true)
        setCooldownRemaining(REFRESH_COOLDOWN - elapsed)
      }
    }
  }, [])

  // クールダウンタイマー
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      setIsDisabled(false)
      return
    }

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        const newValue = prev - 1000
        if (newValue <= 0) {
          setIsDisabled(false)
          clearInterval(timer)
          return 0
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownRemaining])

  // プログレスバーのアニメーション
  useEffect(() => {
    if (!isRefreshing) {
      setProgress(0)
      return
    }

    // 進行状況を段階的に更新するためのインターバル
    const progressInterval = setInterval(() => {
      setProgress((prevProgress) => {
        // 95%までしか自動で進まないようにする（完了は実際のレスポンスを待つ）
        if (prevProgress >= 95) {
          clearInterval(progressInterval)
          return prevProgress
        }
        return prevProgress + 1
      })
    }, ESTIMATED_FETCH_TIME / 100)

    return () => clearInterval(progressInterval)
  }, [isRefreshing])

  async function handleRefresh() {
    // クールダウン中なら処理しない
    if (isDisabled) {
      const seconds = Math.ceil(cooldownRemaining / 1000)
      toast({
        title: t("refreshLimited"),
        description: `${seconds}${t("secondsRemaining")}`,
        variant: "default",
      })
      return
    }

    try {
      setIsRefreshing(true)
      setProgress(0)

      // 進行状況の初期値を設定
      setTimeout(() => setProgress(10), 100)

      // データ更新を実行
      const result = await refreshVideoData()

      // 完了したら100%にする
      setProgress(100)

      // 更新時間を記録
      localStorage.setItem("lastRefreshTime", Date.now().toString())
      setIsDisabled(true)
      setCooldownRemaining(REFRESH_COOLDOWN)

      toast({
        title: result.success ? t("updateComplete") : t("updateError"),
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })

      // 更新が成功したらページを再読み込み
      if (result.success) {
        // 少し遅延させてプログレスバーが100%になるのを見せる
        setTimeout(() => {
          router.refresh()
        }, 500)
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("updateErrorMessage"),
        variant: "destructive",
      })
    } finally {
      // 少し遅延させてからリフレッシュ状態を解除
      setTimeout(() => {
        setIsRefreshing(false)
      }, 500)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing || isDisabled}
        className="gap-1 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing
          ? t("refreshing")
          : isDisabled
            ? `${Math.ceil(cooldownRemaining / 1000)}${t("secondsRemaining")}`
            : t("refreshData")}
      </Button>

      {isRefreshing && (
        <div className="w-full">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center mt-1 text-muted-foreground">
            {progress < 100 ? t("fetchingData") : t("processingData")} ({progress}%)
          </p>
        </div>
      )}
    </div>
  )
}
