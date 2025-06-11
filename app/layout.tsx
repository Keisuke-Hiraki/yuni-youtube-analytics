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

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "YuNi Stellar Chart",
  description: "YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング",
  metadataBase: new URL("https://yuni-stellar-chart.vercel.app"),
  openGraph: {
    title: "YuNi Stellar Chart",
    description: "YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング",
    type: "website",
    url: "/",
    siteName: "YuNi Stellar Chart",
    locale: "ja_JP",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "YuNi Stellar Chart - YuNiの動画ランキングサイト",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YuNi Stellar Chart",
    description: "YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング",
    images: ["/og-image.png"],
    creator: "@YuNiOfficial",
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
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </div>
            <ChatButton />
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
