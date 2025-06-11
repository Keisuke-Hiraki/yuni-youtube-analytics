"use client"

import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatMessage } from '@/lib/groq'

interface ChatDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatDialog({ isOpen, onClose }: ChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 初期メッセージを設定
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'こんにちは！YuNiの動画について何でも聞いてください。動画の検索や質問にお答えします！',
          timestamp: new Date()
        }
      ])
    }
  }, [isOpen, messages.length])

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController()

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          chatHistory: messages
        }),
        signal: abortControllerRef.current.signal
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || `HTTPエラー: ${response.status}`)
      }
    } catch (error) {
      // AbortErrorは無視
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      console.error('チャットエラー:', error)
      
      // エラーの詳細情報を含むメッセージを作成
      let errorContent = 'エラーが発生しました。\n\n'
      
      if (error instanceof Error) {
        errorContent += `エラー名: ${error.name}\n`
        errorContent += `エラーメッセージ: ${error.message}\n`
        
        if (error.message.includes('fetch')) {
          errorContent += '\n原因: ネットワーク接続の問題またはサーバーエラー'
        } else if (error.message.includes('401')) {
          errorContent += '\n原因: APIキーが無効または未設定'
        } else if (error.message.includes('429')) {
          errorContent += '\n原因: APIの利用制限に達しました'
        }
      } else {
        errorContent += `エラー内容: ${String(error)}`
      }
      
      errorContent += '\n\n開発者コンソールで詳細を確認してください。'
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* オーバーレイ（背景クリックで閉じる） */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* サイドパネル */}
      <div className={`
        fixed top-0 right-0 h-full w-full md:w-96 bg-background border-l shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
      `}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">YuNi動画アシスタント</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 chat-messages">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
} 