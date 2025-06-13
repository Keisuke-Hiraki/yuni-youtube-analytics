'use client'

import { useState, useEffect } from 'react'
import { NeonSquares } from './neon-squares'
import { FloatingParticles } from './floating-particles'
import { PulsingDots } from './pulsing-dots'

export const BackgroundManager = () => {
  const [isLowPerformance, setIsLowPerformance] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // デバイス性能とモバイル判定
    const checkPerformance = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2
      
      setIsMobile(isMobileDevice)
      setIsLowPerformance(isLowEnd || isMobileDevice)
    }

    checkPerformance()
  }, [])

  // パフォーマンスに応じてエフェクトを調整
  if (isLowPerformance) {
    // モバイルや低性能デバイスでは軽量なエフェクトのみ
    return <PulsingDots />
  }

  // デスクトップでは全エフェクトを表示
  return (
    <>
      <NeonSquares />
      <PulsingDots />
      <FloatingParticles />
    </>
  )
} 