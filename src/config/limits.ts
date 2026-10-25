export const FREE_LIMITS = {
  MAX_CONCURRENT_LOOPS: 4,
  MAX_PROJECTS: 5,
} as const

export const PRO_LIMITS = {
  MAX_CONCURRENT_LOOPS: Infinity,
  MAX_PROJECTS: Infinity,
} as const

export function getMaxLoops(isPro: boolean): number {
  return isPro ? PRO_LIMITS.MAX_CONCURRENT_LOOPS : FREE_LIMITS.MAX_CONCURRENT_LOOPS
}

export function getMaxProjects(isPro: boolean): number {
  return isPro ? PRO_LIMITS.MAX_PROJECTS : FREE_LIMITS.MAX_PROJECTS
}
