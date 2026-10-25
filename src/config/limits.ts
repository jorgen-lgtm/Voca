// Pro features temporarily disabled - everyone gets full access
export const FREE_LIMITS = {
  MAX_CONCURRENT_LOOPS: Infinity,
  MAX_PROJECTS: Infinity,
} as const

export const PRO_LIMITS = {
  MAX_CONCURRENT_LOOPS: Infinity,
  MAX_PROJECTS: Infinity,
} as const

export function getMaxLoops(_isPro: boolean): number {
  return Infinity // All features free for now
}

export function getMaxProjects(_isPro: boolean): number {
  return Infinity // All features free for now
}
