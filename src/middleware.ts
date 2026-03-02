import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Clinician routes
    if (pathname.startsWith('/patients')) {
      if (token?.role !== 'CLINICIAN') {
        return NextResponse.redirect(new URL('/signin', req.url))
      }
    }

    // Patient routes
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/timeline') ||
      pathname.startsWith('/logs')
    ) {
      if (token?.role !== 'PATIENT') {
        return NextResponse.redirect(new URL('/signin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/timeline/:path*', '/logs/:path*', '/patients/:path*'],
}
