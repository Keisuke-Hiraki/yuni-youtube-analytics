"use client"

import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "./mode-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { useLanguage } from "@/lib/language-context"
import { SITE_TITLE } from "@/lib/language-context"

export function SiteHeader() {
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gray-900 text-white backdrop-blur">
      <div className="max-w-screen-xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold transition-all duration-300 hover:text-primary hover:scale-105"
        >
          <Image src="/icon.png" alt="YuNi Logo" width={24} height={24} className="rounded-sm" />
          <span className="inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            {SITE_TITLE}
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-2">
            <LanguageSwitcher />
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
