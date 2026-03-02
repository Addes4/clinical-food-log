'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScoreInput } from '@/components/ScoreInput'

interface SymptomLogFormProps {
  initialData?: {
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
}

function toLocalDatetimeString(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const BOWEL_OPTIONS = ['None', '1', '2', '3', '4', '5+']

export function SymptomLogForm({ initialData }: SymptomLogFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [datetime, setDatetime] = useState(
    initialData?.datetime
      ? toLocalDatetimeString(new Date(initialData.datetime))
      : toLocalDatetimeString(new Date())
  )
  const [painScore, setPainScore] = useState(initialData?.painScore ?? 0)
  const [bloatingScore, setBloatingScore] = useState(initialData?.bloatingScore ?? 0)
  const [urgencyScore, setUrgencyScore] = useState(initialData?.urgencyScore ?? 0)
  const [nauseaScore, setNauseaScore] = useState(initialData?.nauseaScore ?? 0)
  const [bowelMovement, setBowelMovement] = useState(initialData?.bowelMovement ?? 'None')
  const [bristolScale, setBristolScale] = useState(initialData?.bristolScale?.toString() ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      datetime: new Date(datetime).toISOString(),
      painScore,
      bloatingScore,
      urgencyScore,
      nauseaScore,
      bowelMovement,
      bristolScale: bristolScale ? parseInt(bristolScale) : null,
      notes: notes.trim() || null,
    }

    const url = isEdit ? `/api/logs/symptom/${initialData!.id}` : '/api/logs/symptom'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="datetime">Date & Time</Label>
        <Input
          id="datetime"
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>

      <div className="space-y-4 p-4 bg-gray-50 rounded-md">
        <ScoreInput label="Pain" name="painScore" value={painScore} onChange={setPainScore} />
        <ScoreInput label="Bloating" name="bloatingScore" value={bloatingScore} onChange={setBloatingScore} />
        <ScoreInput label="Urgency" name="urgencyScore" value={urgencyScore} onChange={setUrgencyScore} />
        <ScoreInput label="Nausea" name="nauseaScore" value={nauseaScore} onChange={setNauseaScore} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bowelMovement">Bowel Movements</Label>
          <Select
            id="bowelMovement"
            value={bowelMovement}
            onChange={(e) => setBowelMovement(e.target.value)}
          >
            {BOWEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="bristolScale">Bristol Scale (1–7)</Label>
          <Input
            id="bristolScale"
            type="number"
            min={1}
            max={7}
            value={bristolScale}
            onChange={(e) => setBristolScale(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional observations..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update symptoms' : 'Log symptoms'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
