import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Routes that require authentication (staff/admin)
const AUTH_REQUIRED_PREFIXES = ['/dashboard', '/events', '/admin', '/favorites']

// Routes that require visitor_access cookie
const VISITOR_REQUIRED_PREFIXES = ['/gallery']

// Fully public routes (no guard needed)
const PUBLIC_PREFIXES = ['/', '/login', '/signup', '/visitor', '/auth', '/api']

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.slice(1).some((prefix) => pathname.startsWith(prefix))
}

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function requiresVisitorAccess(pathname: string): boolean {
  return VISITOR_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  // updateSession must run first to refresh tokens and set cookies correctly
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // Skip guards for public routes
  if (isPublic(pathname)) {
    return response
  }

  // We need a fresh Supabase client that reads from the refreshed cookies on
  // the response (updateSession may have set new tokens).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(
              name,
              value,
              options as Parameters<typeof response.cookies.set>[2]
            )
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth-protected routes
  if (requiresAuth(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // Visitor-access-protected routes
  if (requiresVisitorAccess(pathname)) {
    const visitorCookie = request.cookies.get('visitor_access')
    if (!visitorCookie?.value) {
      const visitorUrl = new URL('/visitor', request.url)
      return NextResponse.redirect(visitorUrl)
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (favicon)
     * - public folder files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
