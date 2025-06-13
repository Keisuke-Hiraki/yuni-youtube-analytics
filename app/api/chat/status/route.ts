import { NextResponse } from 'next/server'

function isChatbotEnabled(): boolean {
  const enableChatbot = process.env.ENABLE_CHATBOT
  const hasGroqKey = !!process.env.GROQ_API_KEY
  
  // ENABLE_CHATBOTが明示的にfalseの場合は無効
  if (enableChatbot === 'false') {
    return false
  }
  
  // ENABLE_CHATBOTがtrueまたは未設定の場合、APIキーの存在で判定
  return hasGroqKey
}

export async function GET() {
  return NextResponse.json({
    enabled: isChatbotEnabled(),
    hasGroqKey: !!process.env.GROQ_API_KEY,
    enableChatbotEnv: process.env.ENABLE_CHATBOT || 'undefined'
  })
} 