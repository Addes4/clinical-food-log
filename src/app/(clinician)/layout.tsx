import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/signin')
  if (session.user.role !== 'CLINICIAN') {
    if (session.user.role === 'PATIENT') redirect('/dashboard')
    redirect('/admin/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
