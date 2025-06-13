"use client"

import Link from "next/link"
import Image from "next/image"
import { LanguageSwitcher } from "./language-switcher"
import { NeonText } from "./neon/neon-text"
import { useLanguage } from "@/lib/language-context"
import { SITE_TITLE } from "@/lib/language-context"

export function SiteHeader() {
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neon-pink/30 bg-music-dark/80 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 transition-all duration-300 hover:scale-105"
        >
          <div className="relative">
            <Image 
              src="/icon.png" 
              alt="YuNi Logo" 
              width={32} 
              height={32} 
              className="rounded-full border-2 border-neon-cyan neon-glow-cyan" 
            />
            <div className="absolute inset-0 rounded-full bg-neon-cyan/20 animate-pulse" />
          </div>
          <NeonText size="md" color="pink" animate={false}>
            {SITE_TITLE}
          </NeonText>
        </Link>
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-3">
            <LanguageSwitcher />
          </nav>
        </div>
      </div>
      
      {/* ヘッダー下部のネオンライン */}
      <div className="h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-50" />
    </header>
  )
}
