import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-medium mb-6">ページが見つかりません</h2>
      <p className="text-muted-foreground mb-8 max-w-md">お探しのページは存在しないか、移動した可能性があります。</p>
      <Button asChild>
        <Link href="/">トップページに戻る</Link>
      </Button>
    </div>
  )
}
