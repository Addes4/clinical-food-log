import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/signin')
  if (session.user.role !== 'ADMIN') {
    if (session.user.role === 'CLINICIAN') redirect('/patients')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  )
}
