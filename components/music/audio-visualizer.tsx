'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export const AudioVisualizer = () => {
  const [bars, setBars] = useState<number[]>([])

  useEffect(() => {
    // ランダムな高さのバーを生成（実際の音声データの代わり）
    const generateBars = () => {
      const newBars = Array.from({ length: 32 }, () => Math.random() * 100)
      setBars(newBars)
    }

    generateBars()
    const interval = setInterval(generateBars, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-end justify-center gap-1 h-32">
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="w-2 spectrum-bar rounded-t"
          animate={{ height: `${height}%` }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{
            background: `hsl(${(index * 360) / bars.length}, 100%, 50%)`,
            filter: `drop-shadow(0 0 5px hsl(${(index * 360) / bars.length}, 100%, 50%))`
          }}
        />
      ))}
    </div>
  )
} 