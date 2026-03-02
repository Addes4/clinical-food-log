'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrlParam = searchParams.get('callbackUrl')
  const callbackUrl =
    callbackUrlParam && callbackUrlParam.startsWith('/') && !callbackUrlParam.startsWith('//')
      ? callbackUrlParam
      : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Clinical Food Log</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-2">Demo accounts:</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>Patient: anna@example.com / password</p>
            <p>Patient: bjorn@example.com / password</p>
            <p>Clinician: doctor@example.com / password</p>
            <p>Admin: admin@example.com / password</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SignInFallback() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Clinical Food Log</h1>
          <p className="text-sm text-gray-500 mt-1">Loading sign in form...</p>
        </div>
      </CardHeader>
    </Card>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  )
}
