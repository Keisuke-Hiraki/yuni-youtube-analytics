"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-medium mb-6">{t("notFoundTitle")}</h2>
      <p className="text-muted-foreground mb-8 max-w-md">{t("notFoundDescription")}</p>
      <Button asChild>
        <Link href="/">{t("backToHome")}</Link>
      </Button>
    </div>
  )
}
