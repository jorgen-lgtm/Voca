'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { shouldGrantProStatus, isAdminEmail } from '@/config/admin'
import { FREE_BETA_MODE } from '@/config/beta'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  })
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  }, [supabase])

  useEffect(() => {
    let disposed = false
    let version = 0
    // Supabase emits INITIAL_SESSION. Keep this callback synchronous: awaiting
    // another Supabase query here can deadlock the auth session lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const requestVersion = ++version
        setState(prev => ({
          user: session?.user ?? null,
          session,
          profile: session?.user.id === prev.user?.id ? prev.profile : null,
          loading: false,
        }))
        if (!session?.user) return
        const user = session.user
        setTimeout(() => {
          if (disposed || version !== requestVersion) return
          void fetchProfile(user.id).then(profile => {
            if (!disposed && version === requestVersion) {
              setState(prev => ({ ...prev, profile }))
            }
          }).catch(() => {
            // Missing/unavailable profile must not prevent beta music creation.
          })
        }, 0)
      }
    )
    return () => {
      disposed = true
      version++
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  // Check Pro status - admins and users with pro_status get Pro features
  const isAdmin = isAdminEmail(state.user?.email)
  const isPro = FREE_BETA_MODE || shouldGrantProStatus(state.user?.email, state.profile?.pro_status ?? false) || isAdmin

  return {
    ...state,
    signOut,
    isPro,
    isAdmin,
  }
}

