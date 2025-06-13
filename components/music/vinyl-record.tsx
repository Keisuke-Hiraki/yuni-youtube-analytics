'use client'

import { motion } from 'framer-motion'

export const VinylRecord = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} relative`}
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      {/* レコード本体 */}
      <div className="w-full h-full rounded-full bg-gradient-to-r from-vinyl-black to-speaker-gray border-2 border-neon-pink neon-glow-pink vinyl-grooves">
        {/* 中央の穴 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-neon-cyan neon-glow-cyan" />
        
        {/* レコードの溝 */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-gray-600/30"
            style={{
              top: `${15 + i * 15}%`,
              left: `${15 + i * 15}%`,
              right: `${15 + i * 15}%`,
              bottom: `${15 + i * 15}%`,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
} 