'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('exceeded') || error.message.includes('too many')) {
          setMessage({ 
            type: 'info', 
            text: '⚠️ Email-gränsen är nådd (max 2/timme). Använd appen som gäst istället, eller vänta och försök igen.' 
          })
        } else {
          setMessage({ type: 'error', text: error.message })
        }
      } else if (data.user && !data.session) {
        // Email confirmation required - try to log in anyway
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            setMessage({ 
              type: 'info', 
              text: '📧 Konto skapat! Kolla din email för verifiering. Tips: Använd appen som gäst medan du väntar.' 
            })
          } else {
            setMessage({ type: 'success', text: 'Konto skapat! Försök logga in.' })
          }
          setMode('login')
        } else {
          router.push('/')
        }
      } else if (data.session) {
        router.push('/')
      } else {
        setMessage({ type: 'success', text: 'Konto skapat! Du kan nu logga in.' })
        setMode('login')
        setPassword('')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setMessage({ type: 'error', text: 'Fel email eller lösenord.' })
        } else if (error.message.includes('Email not confirmed')) {
          setMessage({ type: 'info', text: '📧 Verifiera din email först. Kolla inkorgen (kan ta tid pga mailbegränsningar).' })
        } else {
          setMessage({ type: 'error', text: error.message })
        }
      } else {
        router.push('/')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">HumWeave</h1>
          <p className="text-gray-400">Hum. Weave. Create.</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
          <div className="flex mb-6 bg-gray-700/50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Logga in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Skapa konto
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                required
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Lösenord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Minst 6 tecken' : 'Ditt lösenord'}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading 
                ? (mode === 'signup' ? 'Skapar konto...' : 'Loggar in...') 
                : (mode === 'signup' ? 'Skapa konto' : 'Logga in')
              }
            </motion.button>
          </form>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : message.type === 'info'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {message.text}
            </motion.div>
          )}

          {/* Guest mode link */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <Link
              href="/"
              className="block w-full py-3 px-4 text-center bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-xl transition-all"
            >
              🎵 Fortsätt utan konto
            </Link>
            <p className="text-xs text-gray-500 text-center mt-2">
              Du kan använda alla funktioner utan att logga in
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          {mode === 'signup' ? 'Har du redan konto? ' : 'Inget konto? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-purple-400 hover:text-purple-300"
          >
            {mode === 'signup' ? 'Logga in' : 'Skapa konto'}
          </button>
        </p>

        {/* Info about email limits */}
        <p className="text-center text-gray-600 text-xs mt-4 max-w-xs mx-auto">
          Obs: Verifieringsmail kan ta tid att skickas pga systemets begränsningar. 
          Använd gärna appen som gäst!
        </p>
      </motion.div>
    </div>
  )
}
