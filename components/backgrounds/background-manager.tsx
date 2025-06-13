'use client'

import { NeonSquares } from './neon-particles'

export const BackgroundManager = () => {
  // React BitsのParticlesを使用して軽量化
  // 重いFloatingParticlesとパフォーマンス判定を削除
  return <NeonSquares />
} 