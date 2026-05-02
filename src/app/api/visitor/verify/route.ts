import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  let code: string | undefined

  try {
    const body = await request.json()
    code = typeof body?.code === 'string' ? body.code : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'A 6-digit code is required.' }, { status: 400 })
  }

  // Determine client IP
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

  const supabase = createServiceClient()

  // Check rate limit
  const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
    client_ip: clientIp,
  })

  if (rlError) {
    console.error('check_rate_limit error:', rlError)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait 10 minutes before trying again.' },
      { status: 429 }
    )
  }

  // Verify code
  const { data: valid, error: verifyError } = await supabase.rpc('verify_visitor_code', {
    input_code: code,
  })

  if (verifyError) {
    console.error('verify_visitor_code error:', verifyError)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  // Set visitor cookie
  const cookieName = process.env.VISITOR_COOKIE_NAME ?? 'visitor_access'
  const cookieStore = await cookies()

  cookieStore.set(cookieName, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
