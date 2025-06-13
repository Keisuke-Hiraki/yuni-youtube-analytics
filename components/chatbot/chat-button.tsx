"use client"

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatDialog } from './chat-dialog'

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isChatbotEnabled, setIsChatbotEnabled] = useState<boolean | null>(null)

  // チャットボット有効性をチェック
  useEffect(() => {
    const checkChatbotStatus = async () => {
      try {
        const response = await fetch('/api/chat/status')
        const data = await response.json()
        setIsChatbotEnabled(data.enabled)
      } catch (error) {
        console.error('チャットボット状態の確認に失敗:', error)
        setIsChatbotEnabled(false)
      }
    }
    checkChatbotStatus()
  }, [])

  // サイドパネルの開閉状態をbodyのクラスに反映
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('chat-panel-open')
    } else {
      document.body.classList.remove('chat-panel-open')
    }

    // クリーンアップ
    return () => {
      document.body.classList.remove('chat-panel-open')
    }
  }, [isOpen])

  // チャットボットが無効または確認中の場合は何も表示しない
  if (isChatbotEnabled === null || !isChatbotEnabled) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
          aria-label="チャットボットを開く"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
      
      <ChatDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  )
} 