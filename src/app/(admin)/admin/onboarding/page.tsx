'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface AdminPatient {
  id: string
  displayName: string
  email: string
}

interface AdminClinician {
  id: string
  displayName: string
  email: string
  patientIds: string[]
  createdAt: string
}

export default function AdminOnboardingPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [clinicians, setClinicians] = useState<AdminClinician[]>([])
  const [selectedPatients, setSelectedPatients] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('password')
  const [error, setError] = useState('')
  const [createdCreds, setCreatedCreds] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/onboarding')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not load onboarding data')
      setLoading(false)
      return
    }
    const data = await res.json()
    setPatients(data.patients)
    setClinicians(data.clinicians)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  function togglePatient(patientId: string) {
    setSelectedPatients((prev) =>
      prev.includes(patientId) ? prev.filter((id) => id !== patientId) : [...prev, patientId]
    )
  }

  async function createClinician(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setCreatedCreds('')

    const res = await fetch('/api/admin/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        displayName,
        temporaryPassword,
        patientIds: selectedPatients,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not create clinician')
      setSaving(false)
      return
    }

    const data = await res.json()
    setCreatedCreds(`${data.clinician.email} / ${data.temporaryPassword}`)
    setEmail('')
    setDisplayName('')
    setSelectedPatients([])
    setSaving(false)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin Onboarding</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create clinician accounts and assign patient panels.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Create clinician account</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={createClinician} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="displayName">Display name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="tempPass">Temporary password</Label>
                <Input id="tempPass" value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} required />
              </div>
            </div>

            <div>
              <Label>Assign patients</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {patients.map((patient) => (
                  <label key={patient.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(patient.id)}
                      onChange={() => togglePatient(patient.id)}
                    />
                    <span>{patient.displayName}</span>
                    <span className="text-gray-400">({patient.email})</span>
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create clinician'}
            </Button>
          </form>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          {createdCreds && (
            <p className="text-sm text-green-700 mt-3">
              Created account credentials: <strong>{createdCreds}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Current clinicians</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : clinicians.length === 0 ? (
            <p className="text-sm text-gray-500">No clinician accounts yet.</p>
          ) : (
            <div className="space-y-2">
              {clinicians.map((clinician) => (
                <div key={clinician.id} className="rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{clinician.displayName}</p>
                      <p className="text-xs text-gray-500">{clinician.email}</p>
                    </div>
                    <Badge variant="info">{clinician.patientIds.length} assigned patients</Badge>
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
