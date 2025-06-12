"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Send, Loader2 } from 'lucide-react'
import { debugLog, debugError } from '@/lib/utils'

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
      // デバッグ: まずGETエンドポイントをテスト
      if (inputMessage.toLowerCase().includes('test api')) {
        debugLog('APIテストを実行中...')
        const testResponse = await fetch('/api/chat', {
          method: 'GET',
        })
        const testData = await testResponse.text()
        debugLog('APIテスト結果:', {
          status: testResponse.status,
          data: testData
        })
        
        const testMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `APIテスト結果:\nステータス: ${testResponse.status}\nレスポンス: ${testData}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, testMessage])
        setIsLoading(false)
        return
      }

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
        throw new Error(`サーバーから無効なレスポンスが返されました: ${responseText.substring(0, 100)}`)
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
        throw new Error(data.error || `HTTPエラー: ${response.status}`)
      }
    } catch (error) {
      // AbortErrorは無視
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      debugError('チャットエラー:', error)
      
      // エラーの詳細情報を含むメッセージを作成
      let errorContent = ''
      
      if (error instanceof Error) {
        // Groq公式ドキュメントに基づくエラーハンドリング
        // https://console.groq.com/docs/errors
        
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          // レート制限の場合は、サーバーからの親切なメッセージをそのまま使用
          errorContent = error.message
        } else if (error.message.includes('498') || error.message.includes('Flex Tier Capacity Exceeded')) {
          // Flex Tier容量超過の場合も、サーバーからのメッセージを使用
          errorContent = error.message
        } else if (error.message.includes('413') || error.message.includes('Request Entity Too Large')) {
          errorContent = '送信されたメッセージが長すぎます。質問を短くしてもう一度お試しください。'
        } else if (error.message.includes('422') || error.message.includes('Unprocessable Entity')) {
          errorContent = 'リクエストの内容に問題があります。質問を見直してもう一度お試しください。'
        } else if (error.message.includes('fetch')) {
          errorContent = 'ネットワーク接続の問題が発生しました。インターネット接続を確認してから、もう一度お試しください。'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorContent = 'APIキーが無効または未設定です。管理者にお問い合わせください。'
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorContent = 'サーバー内部エラーが発生しました。しばらく経ってからもう一度お試しください。'
        } else if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
          errorContent = 'サーバー接続エラーが発生しました。しばらく経ってからもう一度お試しください。'
        } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
          errorContent = 'サービスが一時的に利用できません。メンテナンス中の可能性があります。しばらく経ってからもう一度お試しください。'
        } else {
          // その他のエラーの場合は詳細情報を表示
          errorContent = `エラーが発生しました。\n\nエラー名: ${error.name}\nエラーメッセージ: ${error.message}\n\n開発者コンソールで詳細を確認してください。`
        }
      } else {
        errorContent = `予期しないエラーが発生しました。\n\nエラー内容: ${String(error)}`
      }
      
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