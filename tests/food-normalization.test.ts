import { normalizeFood } from '../src/lib/food-normalization'

describe('normalizeFood', () => {
  describe('exact synonym matches', () => {
    it('matches exact Swedish food names', () => {
      const result = normalizeFood('falukorv')
      expect(result.canonical).toBe('falukorv')
      expect(result.confidence).toBe(0.95)
    })

    it('matches English synonyms', () => {
      const result = normalizeFood('salmon')
      expect(result.canonical).toBe('lax')
      expect(result.confidence).toBe(0.95)
    })

    it('matches case-insensitively', () => {
      const result = normalizeFood('PASTA')
      expect(result.canonical).toBe('pasta')
      expect(result.confidence).toBe(0.95)
    })

    it('matches with leading/trailing whitespace', () => {
      const result = normalizeFood('  kaffe  ')
      expect(result.canonical).toBe('kaffe')
      expect(result.confidence).toBe(0.95)
    })

    it('normalizes havregrynsgröt variants', () => {
      expect(normalizeFood('oatmeal').canonical).toBe('havregrynsgröt')
      expect(normalizeFood('porridge').canonical).toBe('havregrynsgröt')
    })

    it('normalizes pasta variants', () => {
      expect(normalizeFood('spaghetti').canonical).toBe('pasta')
      expect(normalizeFood('penne').canonical).toBe('pasta')
    })

    it('normalizes egg variants', () => {
      expect(normalizeFood('eggs').canonical).toBe('ägg')
      expect(normalizeFood('egg').canonical).toBe('ägg')
    })
  })

  describe('brand detection', () => {
    it('strips known brand and matches underlying food', () => {
      const result = normalizeFood('Oatly havregrynsgröt')
      expect(result.canonical).toBe('havregrynsgröt')
      expect(result.brand).toBe('oatly')
      expect(result.confidence).toBe(0.85)
    })

    it('strips Arla brand', () => {
      const result = normalizeFood('Arla filmjölk')
      expect(result.canonical).toBe('filmjölk')
      expect(result.brand).toBe('arla')
      expect(result.confidence).toBe(0.85)
    })

    it('strips ICA brand', () => {
      const result = normalizeFood('ICA yoghurt')
      expect(result.canonical).toBe('yoghurt')
      expect(result.brand).toBe('ica')
    })
  })

  describe('modifier stripping', () => {
    it('strips laktosfri modifier', () => {
      const result = normalizeFood('laktosfri mjölk')
      expect(result.canonical).toBe('mjölk')
      expect(result.confidence).toBe(0.80)
    })

    it('strips ekologisk modifier', () => {
      const result = normalizeFood('ekologisk yoghurt')
      expect(result.canonical).toBe('yoghurt')
      expect(result.confidence).toBe(0.80)
    })

    it('strips light modifier', () => {
      const result = normalizeFood('light yoghurt')
      expect(result.canonical).toBe('yoghurt')
      expect(result.confidence).toBe(0.80)
    })
  })

  describe('fuzzy matching', () => {
    it('fuzzy matches slight typos', () => {
      const result = normalizeFood('falukorrv') // typo of falukorv (not in dict)
      expect(result.canonical).toBe('falukorv')
      expect(result.confidence).toBe(0.65)
    })

    it('fuzzy matches pasta variant', () => {
      const result = normalizeFood('pastta') // typo (not in dict)
      expect(result.canonical).toBe('pasta')
      expect(result.confidence).toBe(0.65)
    })
  })

  describe('unknown foods', () => {
    it('returns 0.5 confidence for unknown foods', () => {
      const result = normalizeFood('xylophonequiche')
      expect(result.confidence).toBe(0.50)
      expect(result.canonical).toBe('xylophonequiche')
    })

    it('preserves raw input', () => {
      const result = normalizeFood('My Custom Food')
      expect(result.rawInput).toBe('My Custom Food')
    })
  })

  describe('confidence ordering', () => {
    it('exact match has highest confidence (0.95)', () => {
      expect(normalizeFood('pasta').confidence).toBe(0.95)
    })

    it('brand+exact has 0.85 confidence', () => {
      expect(normalizeFood('Arla filmjölk').confidence).toBe(0.85)
    })

    it('modifier-stripped has 0.80 confidence', () => {
      expect(normalizeFood('ekologisk yoghurt').confidence).toBe(0.80)
    })

    it('fuzzy match has 0.65 confidence', () => {
      expect(normalizeFood('falukorrv').confidence).toBe(0.65)
    })

    it('unknown has 0.50 confidence', () => {
      expect(normalizeFood('unknownfoodxyz123').confidence).toBe(0.50)
    })
  })
})
