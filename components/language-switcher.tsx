"use client"

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="transition-all duration-300 hover:text-primary hover:scale-105 text-white"
        >
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">言語を切り替える</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("ja")} className={language === "ja" ? "bg-muted" : ""}>
          日本語
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-muted" : ""}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("zh")} className={language === "zh" ? "bg-muted" : ""}>
          中文
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("ko")} className={language === "ko" ? "bg-muted" : ""}>
          한국어
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
