const required = (key: string) => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing environment variable: ${key}`)
  return value
}

export const env = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  redirectUrl: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
}

export type AppRole = 'owner' | 'finance' | 'operations' | 'production' | 'viewer'
export const roleLabels: Record<AppRole, { en: string; ar: string }> = {
  owner: { en: 'Owner', ar: 'المالك' }, finance: { en: 'Finance', ar: 'المالية' }, operations: { en: 'Operations', ar: 'العمليات' }, production: { en: 'Production', ar: 'الإنتاج' }, viewer: { en: 'Viewer', ar: 'مشاهد' },
}

export function getRole(user: { app_metadata?: { role?: string } } | null): AppRole | null {
  const role = user?.app_metadata?.role
  return role && role in roleLabels ? role as AppRole : null
}
