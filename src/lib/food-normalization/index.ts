import { synonymMap, knownBrands, modifiers } from './synonyms'
import { NormalizedFood } from '@/types'

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return (maxLen - levenshtein(a, b)) / maxLen
}

function normalize(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}

function detectBrand(text: string): { brand?: string; stripped: string } {
  for (const brand of knownBrands) {
    if (text.startsWith(brand + ' ')) {
      return { brand, stripped: text.slice(brand.length + 1).trim() }
    }
    if (text === brand) {
      return { brand, stripped: text }
    }
  }
  return { stripped: text }
}

function stripModifiers(text: string): string {
  let result = text
  for (const mod of modifiers) {
    result = result.replace(new RegExp(`\\b${mod}\\b`, 'g'), '').trim()
  }
  return result.replace(/\s+/g, ' ').trim()
}

function lookupSynonym(text: string): string | undefined {
  return synonymMap[text]
}

function fuzzyMatch(text: string): { canonical: string; score: number } | undefined {
  let best: { canonical: string; score: number } | undefined

  for (const key of Object.keys(synonymMap)) {
    const score = similarity(text, key)
    if (score >= 0.8) {
      if (!best || score > best.score) {
        best = { canonical: synonymMap[key], score }
      }
    }
  }

  return best
}

export function normalizeFood(rawInput: string): Omit<NormalizedFood, 'canonicalFoodId'> {
  const normalized = normalize(rawInput)

  // 1. Exact synonym lookup
  const exact = lookupSynonym(normalized)
  if (exact) {
    return { rawInput, canonical: exact, confidence: 0.95 }
  }

  // 2. Brand detection + lookup
  const { brand, stripped } = detectBrand(normalized)
  if (brand && stripped !== normalized) {
    const afterBrand = lookupSynonym(stripped)
    if (afterBrand) {
      return { rawInput, canonical: afterBrand, brand, confidence: 0.85 }
    }
  }

  // 3. Strip modifiers + lookup
  const noModifiers = stripModifiers(normalized)
  if (noModifiers !== normalized) {
    const withoutMod = lookupSynonym(noModifiers)
    if (withoutMod) {
      return { rawInput, canonical: withoutMod, brand, confidence: 0.80 }
    }

    // Also try brand+stripped+no modifiers
    if (brand) {
      const strippedNoMod = stripModifiers(stripped)
      const bothStripped = lookupSynonym(strippedNoMod)
      if (bothStripped) {
        return { rawInput, canonical: bothStripped, brand, confidence: 0.80 }
      }
    }
  }

  // 4. Fuzzy match on normalized
  const fuzzy = fuzzyMatch(normalized)
  if (fuzzy) {
    return { rawInput, canonical: fuzzy.canonical, brand, confidence: 0.65 }
  }

  // 5. Fuzzy match on stripped
  if (stripped !== normalized) {
    const fuzzyStripped = fuzzyMatch(stripped)
    if (fuzzyStripped) {
      return { rawInput, canonical: fuzzyStripped.canonical, brand, confidence: 0.65 }
    }
  }

  // 6. Unknown — use normalized input as canonical
  return { rawInput, canonical: normalized, brand, confidence: 0.50 }
}
