import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// デバッグログ制御用のユーティリティ関数を追加
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isDebugMode = process.env.DEBUG_MODE === 'true' || isDevelopment

export const debugLog = (...args: any[]) => {
  if (isDebugMode) {
    console.log(...args)
  }
}

export const debugError = (...args: any[]) => {
  if (isDebugMode) {
    console.error(...args)
  }
}

export const debugWarn = (...args: any[]) => {
  if (isDebugMode) {
    console.warn(...args)
  }
}
