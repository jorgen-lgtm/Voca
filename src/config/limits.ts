// Free tier limits
export const FREE_LIMITS = {
  MAX_CONCURRENT_LOOPS: 4,  // Free users can have 4 loops at a time
  MAX_PROJECTS: 3,          // Free users can save 3 projects
  MAX_EXPORT_PER_DAY: 1,    // Free users can export once per day
  SHOW_ADS: true,           // Free users see ads
} as const

// Pro tier limits
export const PRO_LIMITS = {
  MAX_CONCURRENT_LOOPS: Infinity,  // Unlimited loops
  MAX_PROJECTS: Infinity,           // Unlimited projects
  MAX_EXPORT_PER_DAY: Infinity,     // Unlimited exports
  SHOW_ADS: false,                  // No ads for Pro users
} as const

export function getMaxLoops(isPro: boolean): number {
  return isPro ? PRO_LIMITS.MAX_CONCURRENT_LOOPS : FREE_LIMITS.MAX_CONCURRENT_LOOPS
}

export function getMaxProjects(isPro: boolean): number {
  return isPro ? PRO_LIMITS.MAX_PROJECTS : FREE_LIMITS.MAX_PROJECTS
}

export function getMaxExportsPerDay(isPro: boolean): number {
  return isPro ? PRO_LIMITS.MAX_EXPORT_PER_DAY : FREE_LIMITS.MAX_EXPORT_PER_DAY
}

export function shouldShowAds(isPro: boolean): boolean {
  return isPro ? PRO_LIMITS.SHOW_ADS : FREE_LIMITS.SHOW_ADS
}

// Pro benefits for marketing
export const PRO_BENEFITS = [
  { icon: '🎵', title: 'Obegränsade loopar', description: 'Skapa så många lager du vill' },
  { icon: '💾', title: 'Obegränsade projekt', description: 'Spara alla dina låtidéer' },
  { icon: '📤', title: 'Obegränsad export', description: 'Exportera till MIDI och WAV' },
  { icon: '🚫', title: 'Ingen reklam', description: 'Fokusera på musiken' },
  { icon: '🎧', title: 'AI-producent', description: 'Full tillgång till Studio AI' },
  { icon: '⚡', title: 'Prioriterad support', description: 'Snabb hjälp när du behöver' },
] as const
