'use client'

import { useState, useEffect } from 'react'
import { NeonSquares } from './neon-squares'
import { FloatingParticles } from './floating-particles'

export const BackgroundManager = () => {
  const [isLowPerformance, setIsLowPerformance] = useState(false)

  useEffect(() => {
    // デバイス性能とモバイル判定
    const checkPerformance = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
      const isSlowConnection = (navigator as any).connection && (navigator as any).connection.effectiveType && 
        ['slow-2g', '2g', '3g'].includes((navigator as any).connection.effectiveType)
      
      setIsLowPerformance(isLowEnd || isMobileDevice || isSlowConnection)
    }

    checkPerformance()
  }, [])

  // パフォーマンスに応じてエフェクトを調整
  if (isLowPerformance) {
    // モバイルや低性能デバイスでは軽量なエフェクトのみ
    return <NeonSquares />
  }

  // デスクトップでは2つのエフェクトを表示（PulsingDotsを削除）
  return (
    <>
      <NeonSquares />
      <FloatingParticles />
    </>
  )
} 