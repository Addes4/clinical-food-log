'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AdminResearchPage() {
  const [deidentify, setDeidentify] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportText, setExportText] = useState('')

  async function runExport() {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/admin/research-export?deidentify=${deidentify ? '1' : '0'}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Could not generate export')
      setLoading(false)
      return
    }

    const data = await res.json()
    setExportText(JSON.stringify(data, null, 2))
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Research Export</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate raw datasets with optional de-identification mode.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">Export options</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              id="deidentify"
              type="checkbox"
              checked={deidentify}
              onChange={(e) => setDeidentify(e.target.checked)}
            />
            <label htmlFor="deidentify" className="text-sm text-gray-700">
              De-identification mode
            </label>
            <Badge variant={deidentify ? 'success' : 'warning'}>
              {deidentify ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="mt-4">
            <Button type="button" onClick={runExport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate export JSON'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      {exportText && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Export preview</h2>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 rounded-md p-3 overflow-auto max-h-[30rem]">
              {exportText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
