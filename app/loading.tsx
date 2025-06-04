import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg">動画データを読み込み中...</p>
      <p className="text-sm text-muted-foreground">しばらくお待ちください</p>
    </div>
  )
}
