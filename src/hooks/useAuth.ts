'use client'

import { useEffect, useState, useCallback } from 'react'
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
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data
  }, [supabase])

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      let profile: UserProfile | null = null
      if (session?.user) {
        profile = await fetchProfile(session.user.id)
      }

      setState({
        user: session?.user ?? null,
        session,
        profile,
        loading: false,
      })
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        let profile: UserProfile | null = null
        if (session?.user) {
          profile = await fetchProfile(session.user.id)
        }

        setState({
          user: session?.user ?? null,
          session,
          profile,
          loading: false,
        })
      }
    )

    return () => {
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

