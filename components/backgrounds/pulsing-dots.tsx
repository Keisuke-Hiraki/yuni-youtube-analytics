'use client'

import { useEffect, useRef } from 'react'

interface Dot {
  x: number
  y: number
  baseSize: number
  color: string
  phase: number
  pulseSpeed: number
}

export const PulsingDots = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const dotsRef = useRef<Dot[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createDots = () => {
      const dots: Dot[] = []
      const spacing = 100
      const neonColors = ['#ff0080', '#00ffff', '#39ff14', '#bf00ff', '#ff6600']

      for (let x = spacing; x < window.innerWidth; x += spacing) {
        for (let y = spacing; y < window.innerHeight; y += spacing) {
          dots.push({
            x,
            y,
            baseSize: Math.random() * 2 + 1.5,
            color: neonColors[Math.floor(Math.random() * neonColors.length)],
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.015 + 0.008,
          })
        }
      }
      dotsRef.current = dots
    }

    let time = 0
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.016

      dotsRef.current.forEach((dot) => {
        const pulseSize = dot.baseSize + Math.sin(time * 60 * dot.pulseSpeed + dot.phase) * dot.baseSize * 0.8
        const opacity = 0.2 + 0.3 * Math.sin(time * 60 * dot.pulseSpeed + dot.phase)

        ctx.shadowColor = dot.color
        ctx.shadowBlur = pulseSize * 3
        ctx.globalAlpha = opacity
        ctx.fillStyle = dot.color
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, pulseSize, 0, Math.PI * 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    createDots()
    animate()

    const handleResize = () => {
      resizeCanvas()
      createDots()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'transparent', zIndex: -1 }}
    />
  )
} 