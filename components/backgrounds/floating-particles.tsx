'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  color: string
  opacity: number
  speedX: number
  speedY: number
  symbol: string
  rotation: number
  rotationSpeed: number
}

export const FloatingParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<Particle[]>([])
  const lastTimeRef = useRef<number>(0)
  const fpsLimitRef = useRef<number>(24) // 24FPSに制限

  const neonColors = ['#ff0080', '#00ffff', '#39ff14', '#bf00ff', '#ff6600']
  const musicSymbols = ['♪', '♫', '♬', '♩', '♭', '♯', '𝄞']

  // パフォーマンス監視
  const checkPerformance = useCallback(() => {
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isLowEnd || isMobile) {
      fpsLimitRef.current = 15 // 低性能デバイスは15FPS
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    checkPerformance()

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = () => {
      const particles: Particle[] = []
      // 要素数を大幅削減（40000 → 100000に変更）
      const particleCount = Math.min(
        Math.floor((window.innerWidth * window.innerHeight) / 100000),
        30 // 最大30個に制限
      )

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 12 + 10, // サイズを小さく
          color: neonColors[Math.floor(Math.random() * neonColors.length)],
          opacity: Math.random() * 0.3 + 0.2,
          speedX: (Math.random() - 0.5) * 0.2, // 速度を遅く
          speedY: (Math.random() - 0.5) * 0.2,
          symbol: musicSymbols[Math.floor(Math.random() * musicSymbols.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 0.8, // 回転速度を遅く
        })
      }
      particlesRef.current = particles
    }

    const animate = (currentTime: number) => {
      // FPS制限
      if (currentTime - lastTimeRef.current < 1000 / fpsLimitRef.current) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastTimeRef.current = currentTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle) => {
        particle.x += particle.speedX
        particle.y += particle.speedY
        particle.rotation += particle.rotationSpeed

        // 境界での反射
        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1

        // 描画最適化
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate((particle.rotation * Math.PI) / 180)
        
        // グロー効果を軽量化
        ctx.shadowColor = particle.color
        ctx.shadowBlur = 3 // 6 → 3に削減
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.font = `${particle.size}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(particle.symbol, 0, 0)
        
        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    createParticles()
    animationRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      resizeCanvas()
      createParticles()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [checkPerformance])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'transparent', zIndex: -2 }}
    />
  )
} 