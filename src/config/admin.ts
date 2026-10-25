const ADMIN_EMAILS_ENV = process.env.NEXT_PUBLIC_ADMIN_EMAILS || ''

const DEFAULT_ADMIN_EMAILS = [
  'jorgen@anderssonmpn.se',
]

export const ADMIN_EMAILS: string[] = [
  ...DEFAULT_ADMIN_EMAILS,
  ...ADMIN_EMAILS_ENV
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0)
]

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function shouldGrantProStatus(
  email: string | undefined | null,
  profileProStatus: boolean
): boolean {
  if (profileProStatus) return true
  return isAdminEmail(email)
}
