'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

interface NavLink {
  href: string
  label: string
}

const patientLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/timeline', label: 'Timeline' },
]

const clinicianLinks: NavLink[] = [
  { href: '/patients', label: 'Patients' },
]

export function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const links = session?.user.role === 'CLINICIAN' ? clinicianLinks : patientLinks

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-brand-600 font-semibold text-sm tracking-wide">
              FoodLog
            </span>
            <div className="flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{session?.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/signin' })}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
