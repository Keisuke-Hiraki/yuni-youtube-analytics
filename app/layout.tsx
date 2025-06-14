import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Toaster } from "@/components/toaster"
import { LanguageProvider } from "@/lib/language-context"
import { ChatButton } from "@/components/chatbot/chat-button"
import { BackgroundManager } from "@/components/backgrounds/background-manager"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://yuni-stellar-chart.vercel.app"),
  title: "YuNi Stellar Chart",
  description: "Vsinger YuNiの動画をランキング。",
  openGraph: {
    title: "YuNi Stellar Chart",
    description: "Vsinger YuNiの動画をランキング。",
    url: "https://yuni-stellar-chart.vercel.app",
    siteName: "YuNi Stellar Chart",
    images: [
      {
        url: "https://yuni-stellar-chart.vercel.app/og-image.png",
        width: 1200,
        height: 1200,
        alt: "YuNi Stellar Chart - Vsinger YuNiの動画分析ツール",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YuNi Stellar Chart",
    description: "Vsinger YuNiの動画をランキング",
    images: ["https://yuni-stellar-chart.vercel.app/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 明示的なfaviconリンクを追加 */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            {/* ネオン背景エフェクト */}
            <BackgroundManager />
            <div className="relative flex min-h-screen flex-col" style={{ zIndex: 1 }}>
              <SiteHeader />
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </div>
            <div style={{ zIndex: 1000 }}>
              <ChatButton />
              <Toaster />
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
