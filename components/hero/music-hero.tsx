'use client'

import { motion } from 'framer-motion'
import { NeonText } from '@/components/neon/neon-text'
import { AudioVisualizer } from '@/components/music/audio-visualizer'
import { VinylRecord } from '@/components/music/vinyl-record'
import { useEffect, useState } from 'react'

export const MusicHero = () => {
  const [notes, setNotes] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    // 浮遊する音符を生成
    const generateNotes = () => {
      const newNotes = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }))
      setNotes(newNotes)
    }

    generateNotes()
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-music-darker via-music-dark to-vinyl-black">
      {/* 背景エフェクト */}
      <div 
        className="absolute inset-0 opacity-10 animate-pulse"
        style={{
          background: 'linear-gradient(90deg, #ff0080, #ff6600, #ffff00, #39ff14, #00ffff, #bf00ff)'
        }}
      />
      
      {/* メインコンテンツ */}
      <div className="relative z-10 text-center space-y-8 px-4">
        {/* タイトル */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <NeonText size="xl" color="pink" className="mb-4">
            YuNi
          </NeonText>
          <NeonText size="lg" color="cyan">
            Stellar Chart
          </NeonText>
        </motion.div>

        {/* サブタイトル */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-xl text-gray-300 max-w-2xl mx-auto"
        >
          音楽の世界を彩る、ネオンに輝く動画ランキング
        </motion.p>

        {/* ビジュアライザー */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <AudioVisualizer />
        </motion.div>

        {/* 装飾要素 */}
        <div className="flex justify-center items-center gap-8 mt-12">
          <VinylRecord size="sm" />
          <VinylRecord size="md" />
          <VinylRecord size="sm" />
        </div>
      </div>

      {/* 浮遊する音符 */}
      {notes.map((note) => (
        <motion.div
          key={note.id}
          className="absolute text-neon-green text-2xl opacity-30 floating-notes"
          style={{
            left: `${note.x}%`,
            top: `${note.y}%`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: note.delay,
          }}
        >
          ♪
        </motion.div>
      ))}

      {/* スクロールインジケーター */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-neon-cyan rounded-full flex justify-center">
          <div className="w-1 h-3 bg-neon-cyan rounded-full mt-2 animate-pulse" />
        </div>
      </motion.div>
    </section>
  )
} 