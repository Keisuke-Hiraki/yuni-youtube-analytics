import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'

/**
 * Verifies the `Authorization: Bearer <token>` header against ADMIN_API_KEY
 * using a timing-safe comparison. Both values are SHA-256 hashed first so
 * that timingSafeEqual always compares equal-length buffers, avoiding both
 * length-based short-circuiting and a thrown RangeError on mismatched sizes.
 *
 * Returns true when the request is authorized, false otherwise. If
 * ADMIN_API_KEY is not configured, every request is rejected.
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)

  const tokenHash = createHash('sha256').update(token).digest()
  const adminKeyHash = createHash('sha256').update(adminKey).digest()

  return timingSafeEqual(tokenHash, adminKeyHash)
}

/**
 * Convenience guard for admin API routes. Returns a 401 NextResponse when
 * the request is not authorized, or null when it is authorized and the
 * caller should proceed.
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  return null
}
