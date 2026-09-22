'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setError(error.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'Invalid email or password.'); setBusy(false); return }
    const { data: { user } } = await createClient().auth.getUser()
    const role = user?.app_metadata?.role
    if ((role === 'owner' || role === 'finance') && user?.factors?.some(factor => factor.status === 'verified')) { window.location.assign('/auth/mfa'); return }
    window.location.assign('/')
  }
  return <main className="grid min-h-screen place-items-center bg-[#201d1b] px-4 text-[#f3eee5]"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[#453d38] bg-[#292522] p-7 shadow-xl"><div className="mb-8 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#6d3d42] text-lg font-bold">N</div><div><div className="font-semibold tracking-[.18em]">NOQTA</div><div className="text-[10px] uppercase tracking-[.22em] text-[#a09284]">operations OS</div></div></div><h1 className="font-serif text-3xl">Welcome back</h1><p className="mt-2 text-sm text-[#a09284]">Sign in to your workspace.</p><p className="mt-3 text-xs text-[#88796c]">No account? Contact the owner for access.</p><div className="mt-7 flex flex-col gap-4"><label className="text-sm">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#51463f] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#a27a76]" /></label><label className="text-sm">Password<input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#51463f] bg-transparent px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#a27a76]" /></label>{error && <p role="alert" className="text-sm text-[#e5a9a5]">{error}</p>}<button disabled={busy} className="rounded-lg bg-[#6d3d42] px-4 py-2.5 font-medium text-[#fff9ef] disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button></div></form></main>
}
