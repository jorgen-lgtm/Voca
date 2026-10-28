import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Feature = 'melody' | 'transcription'

const FEATURES: Record<Feature, { reservationMicrousd: number; dailyMax: number }> = {
  // Deliberately conservative reservations; no refund on error or cache hit.
  melody: { reservationMicrousd: 20_000, dailyMax: 10 }, // $0.02 per request
  transcription: { reservationMicrousd: 1_000_000, dailyMax: 2 }, // $1 per request
}

export async function authorizeAiRequest(feature: Feature): Promise<NextResponse | null> {
  // All requirements fail closed. Configure the actual USD cap below the SEK 200
  // budget using the current rate, with a buffer for FX changes and provider lag.
  const monthlyCap = Number(process.env.AI_MAX_MONTHLY_MICROUSD)
  if (process.env.AI_SPEND_GUARD_ENABLED !== 'true'
      || !Number.isSafeInteger(monthlyCap) || monthlyCap <= 0
      || !process.env.SUPABASE_SERVICE_ROLE_KEY
      || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'AI is temporarily unavailable' }, { status: 503 })
  }
  if (feature === 'transcription') {
    return NextResponse.json({ error: 'Audio AI is unavailable during beta' }, { status: 503 })
  }

  try {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to use AI' }, { status: 401 })
  }

  if (user.is_anonymous || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Verify your email to use AI' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const limits = FEATURES[feature]
  const { data, error } = await admin.rpc('reserve_ai_request', {
    p_user_id: user.id,
    p_feature: feature,
    p_cost_microusd: limits.reservationMicrousd,
    p_month_cap_microusd: monthlyCap,
    p_daily_max: limits.dailyMax,
  })

  if (error) {
    // Missing DB migration or a transient DB error must never permit a paid call.
    if (error.code === 'P0001' && error.message === 'AI_DAILY_LIMIT') {
      return NextResponse.json({ error: 'AI usage limit reached' }, { status: 429 })
    }
    console.error('AI quota unavailable:', error.code)
    return NextResponse.json({ error: 'AI quota unavailable' }, { status: 503 })
  }
  if (data !== true) {
    return NextResponse.json({ error: 'AI usage limit reached' }, { status: 429 })
  }
  return null
  } catch {
    return NextResponse.json({ error: 'AI quota unavailable' }, { status: 503 })
  }
}

