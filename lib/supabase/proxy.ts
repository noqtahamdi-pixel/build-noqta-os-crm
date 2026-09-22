import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => {
        request.cookies.set(name, value)
        response.cookies.set(name, value, options)
      }),
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  if (!user && pathname !== '/auth/login' && !pathname.startsWith('/auth/callback') && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  return response
}
