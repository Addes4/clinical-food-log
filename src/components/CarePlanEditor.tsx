'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface CarePlanEditorProps {
  patientId: string
  editable?: boolean
}

interface CarePlanPayload {
  title: string
  goals: string
  notes: string
  lastUpdatedByRole?: string
  updatedAt?: string
}

export function CarePlanEditor({ patientId, editable = true }: CarePlanEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<CarePlanPayload>({
    title: 'Shared care plan',
    goals: '',
    notes: '',
  })

  async function loadPlan() {
    setLoading(true)
    const res = await fetch(`/api/care-plan/${patientId}`)

    if (res.status === 404) {
      setLoading(false)
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not load care plan')
      setLoading(false)
      return
    }

    const data = await res.json()
    setPayload({
      title: data.title ?? 'Shared care plan',
      goals: data.goals ?? '',
      notes: data.notes ?? '',
      lastUpdatedByRole: data.lastUpdatedByRole,
      updatedAt: data.updatedAt,
    })
    setLoading(false)
  }

  useEffect(() => {
    void loadPlan()
  }, [patientId])

  async function savePlan() {
    if (!editable) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/care-plan/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title,
        goals: payload.goals,
        notes: payload.notes || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not save care plan')
      setSaving(false)
      return
    }

    const updated = await res.json()
    setPayload((prev) => ({
      ...prev,
      lastUpdatedByRole: updated.lastUpdatedByRole,
      updatedAt: updated.updatedAt,
    }))
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading care plan...</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor={`care-title-${patientId}`}>Title</Label>
        <Input
          id={`care-title-${patientId}`}
          value={payload.title}
          onChange={(e) => setPayload((prev) => ({ ...prev, title: e.target.value }))}
          disabled={!editable || saving}
        />
      </div>

      <div>
        <Label htmlFor={`care-goals-${patientId}`}>Goals</Label>
        <Textarea
          id={`care-goals-${patientId}`}
          rows={4}
          value={payload.goals}
          onChange={(e) => setPayload((prev) => ({ ...prev, goals: e.target.value }))}
          disabled={!editable || saving}
          placeholder="Document short-term goals and what to track."
        />
      </div>

      <div>
        <Label htmlFor={`care-notes-${patientId}`}>Shared Notes</Label>
        <Textarea
          id={`care-notes-${patientId}`}
          rows={4}
          value={payload.notes}
          onChange={(e) => setPayload((prev) => ({ ...prev, notes: e.target.value }))}
          disabled={!editable || saving}
          placeholder="Patient and clinician can both update these notes."
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {payload.lastUpdatedByRole && (
            <Badge variant="info">Last updated by {payload.lastUpdatedByRole.toLowerCase()}</Badge>
          )}
          {payload.updatedAt && <span>{new Date(payload.updatedAt).toLocaleString('sv-SE')}</span>}
        </div>

        {editable && (
          <Button type="button" onClick={savePlan} disabled={saving}>
            {saving ? 'Saving...' : 'Save care plan'}
          </Button>
        )}
      </div>
    </div>
  )
}
