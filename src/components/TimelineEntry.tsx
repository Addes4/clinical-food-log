import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type EntryType = 'meal' | 'symptom' | 'context'

interface MealEntry {
  type: 'meal'
  id: string
  datetime: string
  mealType: string
  title: string
  notes?: string | null
  foodItems: Array<{ rawInput: string; canonicalFood?: { name: string } | null; confidence: number }>
}

interface SymptomEntry {
  type: 'symptom'
  id: string
  datetime: string
  painScore: number
  bloatingScore: number
  urgencyScore: number
  nauseaScore: number
  bowelMovement: string
  bristolScale?: number | null
  notes?: string | null
}

interface ContextEntry {
  type: 'context'
  id: string
  datetime: string
  stressScore: number
  sleepHours: number
  medicationTaken?: string | null
  alcohol: boolean
  exercise: string
  notes?: string | null
}

type TimelineEntryProps = {
  entry: MealEntry | SymptomEntry | ContextEntry
  editHref?: string
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

function scoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score <= 3) return 'success'
  if (score <= 6) return 'warning'
  return 'danger'
}

export function TimelineEntry({ entry, editHref }: TimelineEntryProps) {
  const time = formatTime(entry.datetime)

  const typeColors: Record<EntryType, string> = {
    meal: 'bg-blue-50 border-blue-200',
    symptom: 'bg-red-50 border-red-200',
    context: 'bg-purple-50 border-purple-200',
  }

  const typeLabels: Record<EntryType, string> = {
    meal: 'Meal',
    symptom: 'Symptoms',
    context: 'Context',
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-500 w-12 text-right">{time}</div>
      </div>
      <div className="flex-1">
        <Card className={['border', typeColors[entry.type]].join(' ')}>
          <CardContent className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {typeLabels[entry.type]}
                  </span>
                  {entry.type === 'meal' && (
                    <Badge variant="info">{entry.mealType}</Badge>
                  )}
                </div>

                {entry.type === 'meal' && (
                  <>
                    <p className="text-sm font-medium text-gray-900 mb-1">{entry.title}</p>
                    {entry.foodItems.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.foodItems.map((item, i) => (
                          <Badge key={i} variant={item.confidence >= 0.8 ? 'success' : 'default'}>
                            {item.canonicalFood?.name ?? item.rawInput}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {entry.type === 'symptom' && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600">
                      Pain: <Badge variant={scoreVariant(entry.painScore)}>{entry.painScore}</Badge>
                    </span>
                    <span className="text-xs text-gray-600">
                      Bloating: <Badge variant={scoreVariant(entry.bloatingScore)}>{entry.bloatingScore}</Badge>
                    </span>
                    <span className="text-xs text-gray-600">
                      Urgency: <Badge variant={scoreVariant(entry.urgencyScore)}>{entry.urgencyScore}</Badge>
                    </span>
                    <span className="text-xs text-gray-600">
                      Nausea: <Badge variant={scoreVariant(entry.nauseaScore)}>{entry.nauseaScore}</Badge>
                    </span>
                    {entry.bowelMovement && (
                      <span className="text-xs text-gray-600">BM: {entry.bowelMovement}</span>
                    )}
                  </div>
                )}

                {entry.type === 'context' && (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <span>Stress: <strong>{entry.stressScore}/10</strong></span>
                    <span>Sleep: <strong>{entry.sleepHours}h</strong></span>
                    <span>Exercise: <strong>{entry.exercise}</strong></span>
                    {entry.alcohol && <Badge variant="warning">Alcohol</Badge>}
                    {entry.medicationTaken && (
                      <Badge variant="info">Meds: {entry.medicationTaken}</Badge>
                    )}
                  </div>
                )}

                {entry.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">{entry.notes}</p>
                )}
              </div>

              {editHref && (
                <Link
                  href={editHref}
                  className="text-xs text-brand-600 hover:underline shrink-0"
                >
                  Edit
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
