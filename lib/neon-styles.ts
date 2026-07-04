// Shared neon color mapping used by both the grid card (NeonVideoCard) and
// the list item (VideoListItem). These are fully static class name strings —
// Tailwind cannot see dynamically interpolated class names (e.g. `via-${color}/10`)
// at build time, so every color must be spelled out explicitly here.

export const NEON_COLORS = ["pink", "cyan", "green", "purple", "orange"] as const

export type NeonColor = (typeof NEON_COLORS)[number]

export function getNeonColor(index: number): NeonColor {
  return NEON_COLORS[index % NEON_COLORS.length]
}

export const glowClasses: Record<NeonColor, string> = {
  pink: "neon-glow-pink",
  cyan: "neon-glow-cyan",
  green: "neon-glow-green",
  purple: "neon-glow-purple",
  orange: "shadow-lg shadow-neon-orange/20",
}

export const borderClasses: Record<NeonColor, string> = {
  pink: "border-neon-pink",
  cyan: "border-neon-cyan",
  green: "border-neon-green",
  purple: "border-neon-purple",
  orange: "border-neon-orange",
}

export const bgClasses: Record<NeonColor, string> = {
  pink: "bg-neon-pink",
  cyan: "bg-neon-cyan",
  green: "bg-neon-green",
  purple: "bg-neon-purple",
  orange: "bg-neon-orange",
}

// Static replacement for the previously-dynamic `via-${color}/10` gradient
// class, which Tailwind's JIT compiler cannot detect and therefore purges.
export const gradientViaClasses: Record<NeonColor, string> = {
  pink: "via-neon-pink/10",
  cyan: "via-neon-cyan/10",
  green: "via-neon-green/10",
  purple: "via-neon-purple/10",
  orange: "via-neon-orange/10",
}

// Caps the per-item entrance animation delay so long lists don't produce an
// increasingly long, visually meaningless stagger — only the first N items
// (20) get an incremental delay, the rest share the same delay.
export function cappedAnimationDelay(index: number, step: number, max = 20): number {
  return Math.min(index, max) * step
}
