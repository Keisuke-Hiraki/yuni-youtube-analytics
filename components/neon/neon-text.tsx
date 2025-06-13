'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NeonTextProps {
  children: React.ReactNode
  className?: string
  color?: 'pink' | 'cyan' | 'green' | 'purple' | 'orange'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
}

export const NeonText = ({ 
  children, 
  className, 
  color = 'pink', 
  size = 'md',
  animate = true 
}: NeonTextProps) => {
  const colorClasses = {
    pink: 'neon-text-pink',
    cyan: 'neon-text-cyan',
    green: 'neon-text-green',
    purple: 'neon-text-purple',
    orange: 'text-neon-orange drop-shadow-[0_0_10px_#ff6600]'
  }

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  }

  return (
    <motion.span
      className={cn(
        'font-bold tracking-wider',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
      animate={animate ? {
        filter: [
          `drop-shadow(0 0 5px currentColor)`,
          `drop-shadow(0 0 15px currentColor)`,
          `drop-shadow(0 0 5px currentColor)`
        ]
      } : undefined}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.span>
  )
} 