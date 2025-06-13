'use client'

import { motion } from 'framer-motion'
import { NeonText } from '@/components/neon/neon-text'
import { AudioVisualizer } from '@/components/music/audio-visualizer'
import { VinylRecord } from '@/components/music/vinyl-record'

export const MusicHero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent">
      {/* 背景を透明にして、ボディの背景エフェクトを表示 */}
      
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
          YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング
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