import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function requireSession(role?: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null }
  }
  if (role && session.user.role !== role) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null }
  }
  return { error: null, session }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function parseLimitParam(value: string | null, defaultLimit = 50, maxLimit = 200): number {
  if (!value || value.trim() === '') return defaultLimit

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return defaultLimit

  return Math.min(parsed, maxLimit)
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const parsed = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function parseRequiredDate(
  value: unknown,
  fieldName: string
): { value: Date; error: null } | { value: null; error: NextResponse } {
  const parsed = parseDate(value)
  if (!parsed) {
    return { value: null, error: badRequest(`${fieldName} must be a valid ISO datetime`) }
  }
  return { value: parsed, error: null }
}

export function parseOptionalDate(
  value: unknown,
  fieldName: string
): { value: Date | undefined; error: null | NextResponse } {
  if (value === undefined) return { value: undefined, error: null }

  const parsed = parseDate(value)
  if (!parsed) {
    return { value: undefined, error: badRequest(`${fieldName} must be a valid ISO datetime`) }
  }
  return { value: parsed, error: null }
}

export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

export function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function isStringEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T
): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}
