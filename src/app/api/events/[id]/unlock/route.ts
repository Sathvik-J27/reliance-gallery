import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  cookieStore.delete(`event_lock_${params.id}`)
  return new NextResponse(null, { status: 204 })
}
