import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function safeRedirectPath(candidate: string | null, origin: string): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/'
  }

  try {
    const url = new URL(candidate, origin)
    if (url.origin !== origin) {
      return '/'
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'), origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/auth/error', origin))
}
