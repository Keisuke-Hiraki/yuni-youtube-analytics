'use client'

import { useEffect, useRef } from 'react'

interface Square {
  x: number
  y: number
  size: number
  color: string
  opacity: number
  speed: number
  rotation: number
  rotationSpeed: number
}

export const NeonSquares = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const squaresRef = useRef<Square[]>([])

  // ネオンカラーパレット（音楽テイスト）
  const neonColors = [
    '#ff0080', // ネオンピンク
    '#00ffff', // ネオンシアン
    '#39ff14', // ネオングリーン
    '#bf00ff', // ネオンパープル
    '#ff6600', // ネオンオレンジ
    '#ffff00', // ネオンイエロー
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createSquares = () => {
      const squares: Square[] = []
      const squareCount = Math.floor((window.innerWidth * window.innerHeight) / 20000) // 密度調整

      for (let i = 0; i < squareCount; i++) {
        squares.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 25 + 8, // 8-33px
          color: neonColors[Math.floor(Math.random() * neonColors.length)],
          opacity: Math.random() * 0.3 + 0.1, // 0.1-0.4
          speed: Math.random() * 0.8 + 0.2, // ゆっくりとした動き
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 1.5, // -0.75 to 0.75
        })
      }
      squaresRef.current = squares
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      squaresRef.current.forEach((square) => {
        // 位置更新
        square.y -= square.speed
        square.rotation += square.rotationSpeed

        // 画面上端を超えたら下から再出現
        if (square.y + square.size < 0) {
          square.y = canvas.height + square.size
          square.x = Math.random() * canvas.width
        }

        // 描画
        ctx.save()
        ctx.translate(square.x + square.size / 2, square.y + square.size / 2)
        ctx.rotate((square.rotation * Math.PI) / 180)
        
        // ネオングロー効果
        ctx.shadowColor = square.color
        ctx.shadowBlur = 12
        ctx.globalAlpha = square.opacity
        
        // 正方形を描画
        ctx.fillStyle = square.color
        ctx.fillRect(-square.size / 2, -square.size / 2, square.size, square.size)
        
        // 内側のハイライト
        ctx.globalAlpha = square.opacity * 0.4
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(-square.size / 4, -square.size / 4, square.size / 2, square.size / 2)
        
        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    createSquares()
    animate()

    const handleResize = () => {
      resizeCanvas()
      createSquares()
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
      style={{ background: 'transparent', zIndex: -3 }}
    />
  )
} 