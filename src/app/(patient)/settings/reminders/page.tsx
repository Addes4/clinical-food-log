'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Reminder {
  id: string
  label: string
  timeOfDay: string
  enabled: boolean
  snoozeMinutes: number
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  snoozedUntil?: string | null
}

export default function ReminderSettingsPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [label, setLabel] = useState('Symptom check-in')
  const [timeOfDay, setTimeOfDay] = useState('20:00')
  const [snoozeMinutes, setSnoozeMinutes] = useState('15')
  const [quietHoursStart, setQuietHoursStart] = useState('22:30')
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/reminders')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not load reminders')
      setLoading(false)
      return
    }
    setReminders(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function createReminder(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        timeOfDay,
        snoozeMinutes: Number.parseInt(snoozeMinutes, 10),
        quietHoursStart: quietHoursStart || null,
        quietHoursEnd: quietHoursEnd || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not create reminder')
      setSaving(false)
      return
    }

    setSaving(false)
    await load()
  }

  async function toggleReminder(reminder: Reminder) {
    const res = await fetch(`/api/reminders/${reminder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !reminder.enabled }),
    })
    if (res.ok) await load()
  }

  async function snoozeReminder(reminder: Reminder) {
    const res = await fetch(`/api/reminders/${reminder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SNOOZE_NOW' }),
    })
    if (res.ok) await load()
  }

  async function deleteReminder(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Symptom Reminders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set custom reminder times with snooze and quiet hours.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Create Reminder</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={createReminder} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="snooze">Snooze (minutes)</Label>
              <Input
                id="snooze"
                type="number"
                min={5}
                max={240}
                value={snoozeMinutes}
                onChange={(e) => setSnoozeMinutes(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="quietStart">Quiet hours start</Label>
              <Input id="quietStart" type="time" value={quietHoursStart} onChange={(e) => setQuietHoursStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="quietEnd">Quiet hours end</Label>
              <Input id="quietEnd" type="time" value={quietHoursEnd} onChange={(e) => setQuietHoursEnd(e.target.value)} />
            </div>

            <div className="col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add reminder'}
              </Button>
            </div>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Active Reminders</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-gray-500">No reminders yet.</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="rounded-md border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {r.timeOfDay} • Snooze {r.snoozeMinutes}m • Quiet {r.quietHoursStart ?? '—'}–{r.quietHoursEnd ?? '—'}
                      </p>
                      {r.snoozedUntil && (
                        <p className="text-xs text-gray-500 mt-1">Snoozed until {new Date(r.snoozedUntil).toLocaleTimeString('sv-SE')}</p>
                      )}
                    </div>
                    <Badge variant={r.enabled ? 'success' : 'default'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => toggleReminder(r)}>
                      {r.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => snoozeReminder(r)}>
                      Snooze now
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => deleteReminder(r.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
