'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'

const FEATURES = {
  free: [
    'Unlimited loop recording',
    'All 9 instruments',
    '4 concurrent loops',
    'Save up to 5 projects',
    'JSON export',
  ],
  pro: [
    'Everything in Free, plus:',
    'Unlimited loops',
    'Unlimited projects',
    'MIDI export',
    'High-quality audio export',
    'Priority support',
    'Early access to new features',
  ],
}

export default function UpgradePage() {
  const { user, loading, isPro } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  if (isPro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">You&apos;re a Pro!</h1>
          <p className="text-gray-400 mb-8">Thank you for supporting HumWeave</p>
          <motion.button
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium"
          >
            Start Creating
          </motion.button>
        </motion.div>
      </div>
    )
  }

  const monthlyPrice = 9.99
  const yearlyPrice = 79.99
  const yearlySavings = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)

  return (
    <div className="min-h-screen p-4 pt-8">
      <div className="max-w-4xl mx-auto">
        <motion.button
          onClick={() => router.push('/')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Upgrade to{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Pro
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Unlock the full potential of HumWeave with MIDI export, unlimited projects, and more.
          </p>
        </motion.div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-gray-800/50 p-1 border border-gray-700/50">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                selectedPlan === 'yearly'
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save {yearlySavings}%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Free</h3>
            <div className="text-3xl font-bold text-white mb-1">$0</div>
            <p className="text-sm text-gray-400 mb-6">Forever free</p>
            
            <ul className="space-y-3">
              {FEATURES.free.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full mt-6 py-3 rounded-xl bg-gray-700/50 text-gray-400 font-medium cursor-not-allowed"
            >
              Current Plan
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative p-6 rounded-2xl bg-gradient-to-b from-purple-900/50 to-pink-900/30 border border-purple-500/50"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold">
              RECOMMENDED
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">Pro</h3>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-white">
                ${selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice}
              </span>
              <span className="text-gray-400">
                /{selectedPlan === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            {selectedPlan === 'yearly' && (
              <p className="text-sm text-green-400 mb-6">
                ${(yearlyPrice / 12).toFixed(2)}/month billed annually
              </p>
            )}
            {selectedPlan === 'monthly' && <div className="mb-6" />}
            
            <ul className="space-y-3">
              {FEATURES.pro.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700 transition-colors"
              onClick={() => {
                alert('Payment integration coming soon! For now, contact us to upgrade.')
              }}
            >
              Upgrade to Pro
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12 text-sm text-gray-500"
        >
          <p>Secure payment powered by Stripe</p>
          <p className="mt-2">Cancel anytime • No questions asked</p>
        </motion.div>
      </div>
    </div>
  )
}
