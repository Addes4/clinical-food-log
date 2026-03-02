export type Role = 'PATIENT' | 'CLINICIAN'
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER'
export type Exercise = 'NONE' | 'LIGHT' | 'MODERATE' | 'INTENSE'

export interface NormalizedFood {
  rawInput: string
  canonical: string
  brand?: string
  confidence: number
  canonicalFoodId?: string
}

export interface SymptomAverages {
  date: string
  painScore: number
  bloatingScore: number
  urgencyScore: number
  nauseaScore: number
  count: number
}

export interface FoodTrigger {
  canonicalFood: string
  associationRate: number
  associatedOccurrences: number
  totalOccurrences: number
}

export interface MealTypeSymptomAverage {
  mealType: string
  painScore: number
  bloatingScore: number
  urgencyScore: number
  nauseaScore: number
  count: number
}

export interface AnalyticsPayload {
  triggers: FoodTrigger[]
  dailyAverages: SymptomAverages[]
  mealTypeAverages: MealTypeSymptomAverage[]
  adherence: {
    totalDays: number
    daysWithLogs: number
    rate: number
  }
}
