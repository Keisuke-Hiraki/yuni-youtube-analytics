"use client"

import { Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function Loading() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg">{t("loading")}</p>
      <p className="text-sm text-muted-foreground">{t("pleaseWait")}</p>
    </div>
  )
}
