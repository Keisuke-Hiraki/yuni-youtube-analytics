"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Send, Loader2 } from 'lucide-react'
import { debugLog, debugError } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatDialog({ isOpen, onClose }: ChatDialogProps) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // 初期メッセージを設定
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: t('chatInitialMessage'),
          timestamp: new Date()
        }
      ])
    }
  }, [isOpen, messages.length, t])

  // 新着メッセージ・ローディング状態が変わるたびに最下部へ自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  // コンポーネントがアンマウントされる際にリクエストをキャンセル
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ダイアログが閉じられる際にリクエストをキャンセル
  useEffect(() => {
    if (!isOpen && abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [isOpen])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // 既存のリクエストをキャンセル
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
      debugLog('POSTリクエスト送信中...')
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

      // レスポンスの内容を確認
      const responseText = await response.text()
      debugLog('APIレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
      })

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        debugError('JSONパースエラー:', parseError)
        debugError('レスポンステキスト:', responseText)
        throw new Error('Invalid JSON response from /api/chat')
      }

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // サーバーからのエラーメッセージ（既にユーザー向けに整形済み）があればそのまま使用し、
        // なければHTTPステータスコードに応じた翻訳済みメッセージにフォールバックする
        const serverErrorMessage: string | undefined =
          typeof data?.error === 'string' && data.error.trim().length > 0 ? data.error : undefined

        let errorContent = serverErrorMessage

        if (!errorContent) {
          switch (response.status) {
            case 400:
              errorContent = t('chatErrorUnprocessable')
              break
            case 401:
              errorContent = t('chatErrorUnauthorized')
              break
            case 413:
              errorContent = t('chatErrorTooLarge')
              break
            case 422:
              errorContent = t('chatErrorUnprocessable')
              break
            case 500:
              errorContent = t('chatErrorServerInternal')
              break
            case 502:
              errorContent = t('chatErrorBadGateway')
              break
            case 503:
              errorContent = t('chatErrorServiceUnavailable')
              break
            default:
              errorContent = t('chatErrorUnknownPrefix')
              break
          }
        }

        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        return
      }
    } catch (error) {
      // AbortErrorは無視
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      debugError('チャットエラー:', error)

      // クライアント側の障害（fetch失敗・JSONパース失敗など）はネットワークエラーとして表示する
      const errorContent = t('chatErrorNetwork')

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0"
      >
        {/* ヘッダー */}
        <SheetHeader className="p-4 border-b text-left space-y-0">
          <SheetTitle>{t('chatTitle')}</SheetTitle>
        </SheetHeader>

        {/* メッセージエリア */}
        <div
          className="flex-1 overflow-y-auto p-4 chat-messages"
          aria-live="polite"
        >
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
            {/* 自動スクロール用のアンカー */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chatPlaceholder')}
              aria-label={t('chatInputLabel')}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
              aria-label={t('chatSendLabel')}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
