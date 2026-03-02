import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/signin')
  }

  if (session.user.role === 'CLINICIAN') {
    redirect('/patients')
  }

  if (session.user.role === 'ADMIN') {
    redirect('/admin/onboarding')
  }

  redirect('/dashboard')
}
