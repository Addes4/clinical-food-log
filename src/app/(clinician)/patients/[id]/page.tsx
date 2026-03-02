import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TimelineEntry } from '@/components/TimelineEntry'
import { computeTriggers } from '@/lib/analytics/triggers'
import { computeDailyAverages } from '@/lib/analytics/averages'
import { computeAdherence } from '@/lib/analytics/adherence'

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const clinicianId = session!.user.profileId
  const patientId = params.id

  const assignment = await prisma.clinicianPatientAssignment.findFirst({
    where: { clinicianId, patientId },
    include: { patient: { include: { user: { select: { email: true } } } } },
  })

  if (!assignment) notFound()

  const patient = assignment.patient

  const [meals, symptoms, contexts, triggers, dailyAverages, adherence] = await Promise.all([
    prisma.mealLog.findMany({
      where: { patientId },
      include: { foodItems: { include: { canonicalFood: true } } },
      orderBy: { datetime: 'desc' },
      take: 30,
    }),
    prisma.symptomLog.findMany({
      where: { patientId },
      orderBy: { datetime: 'desc' },
      take: 30,
    }),
    prisma.contextLog.findMany({
      where: { patientId },
      orderBy: { datetime: 'desc' },
      take: 30,
    }),
    computeTriggers({ patientId }),
    computeDailyAverages(patientId),
    computeAdherence(patientId),
  ])

  // Merge all entries for timeline
  type AnyEntry =
    | { type: 'meal'; datetime: Date; data: typeof meals[0] }
    | { type: 'symptom'; datetime: Date; data: typeof symptoms[0] }
    | { type: 'context'; datetime: Date; data: typeof contexts[0] }

  const allEntries: AnyEntry[] = [
    ...meals.map((m) => ({ type: 'meal' as const, datetime: m.datetime, data: m })),
    ...symptoms.map((s) => ({ type: 'symptom' as const, datetime: s.datetime, data: s })),
    ...contexts.map((c) => ({ type: 'context' as const, datetime: c.datetime, data: c })),
  ].sort((a, b) => b.datetime.getTime() - a.datetime.getTime())

  const overallAvg =
    dailyAverages.length > 0
      ? dailyAverages.reduce((sum, d) => sum + (d.painScore + d.bloatingScore + d.urgencyScore + d.nauseaScore) / 4, 0) /
        dailyAverages.length
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{patient.displayName}</h1>
        <p className="text-sm text-gray-500">{patient.user.email}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-gray-900">{adherence.daysWithLogs}</div>
            <div className="text-xs text-gray-500">Days with logs (last 21)</div>
            <div className="mt-1">
              <Badge variant={adherence.rate >= 0.7 ? 'success' : adherence.rate >= 0.4 ? 'warning' : 'danger'}>
                {Math.round(adherence.rate * 100)}% adherence
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-gray-900">
              {overallAvg !== null ? overallAvg.toFixed(1) : '—'}
            </div>
            <div className="text-xs text-gray-500">Avg symptom score</div>
            {overallAvg !== null && (
              <div className="mt-1">
                <Badge variant={overallAvg >= 5 ? 'danger' : overallAvg >= 3 ? 'warning' : 'success'}>
                  {overallAvg >= 5 ? 'High' : overallAvg >= 3 ? 'Moderate' : 'Low'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-gray-900">{triggers.length}</div>
            <div className="text-xs text-gray-500">Possible food associations</div>
          </CardContent>
        </Card>
      </div>

      {/* Possible triggers */}
      {triggers.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Possible Food Associations</h2>
            <p className="text-xs text-gray-400">
              Foods eaten in the 24h before high-symptom events (avg score ≥5). These are possible
              associations, not causation.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggers.slice(0, 8).map((trigger) => (
                <div key={trigger.canonicalFood} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 capitalize">{trigger.canonicalFood}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {trigger.associatedOccurrences}/{trigger.totalOccurrences} times
                    </span>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-orange-400 h-2 rounded-full"
                        style={{ width: `${trigger.associationRate * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-10 text-right">
                      {Math.round(trigger.associationRate * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symptom trend (last 14 days) */}
      {dailyAverages.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Daily Symptom Averages</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left py-1 pr-4">Date</th>
                    <th className="text-right pr-3">Pain</th>
                    <th className="text-right pr-3">Bloating</th>
                    <th className="text-right pr-3">Urgency</th>
                    <th className="text-right pr-3">Nausea</th>
                    <th className="text-right">Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAverages.slice(-14).reverse().map((day) => (
                    <tr key={day.date} className="border-b border-gray-50">
                      <td className="py-1 pr-4 text-gray-600">{day.date}</td>
                      <td className="text-right pr-3">
                        <span className={day.painScore >= 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {day.painScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right pr-3">
                        <span className={day.bloatingScore >= 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {day.bloatingScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right pr-3">
                        <span className={day.urgencyScore >= 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {day.urgencyScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right pr-3">
                        <span className={day.nauseaScore >= 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {day.nauseaScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right text-gray-400">{day.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Timeline</h2>
        {allEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-400">
              No logs yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allEntries.slice(0, 20).map((entry) => {
              if (entry.type === 'meal') {
                return (
                  <TimelineEntry
                    key={`meal-${entry.data.id}`}
                    entry={{ type: 'meal', ...entry.data, datetime: entry.data.datetime.toISOString() }}
                  />
                )
              }
              if (entry.type === 'symptom') {
                return (
                  <TimelineEntry
                    key={`symptom-${entry.data.id}`}
                    entry={{ type: 'symptom', ...entry.data, datetime: entry.data.datetime.toISOString() }}
                  />
                )
              }
              return (
                <TimelineEntry
                  key={`context-${entry.data.id}`}
                  entry={{ type: 'context', ...entry.data, datetime: entry.data.datetime.toISOString() }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
