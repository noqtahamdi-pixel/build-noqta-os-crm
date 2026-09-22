'use client'

import QRCode from 'qrcode'
import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Factor = { id: string; status: string }

export default function MfaPage() {
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadFactor() {
      const supabase = createClient()
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) { if (!cancelled) setError('We could not load MFA settings.'); return }
      const verified = (data?.totp as Factor[] | undefined)?.find((factor) => factor.status === 'verified')
      if (verified) { if (!cancelled) setFactorId(verified.id); return }
      const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'NOQTA authenticator' })
      if (enrollError || !enrollment?.totp) { if (!cancelled) setError('We could not start MFA enrollment.'); return }
      const image = await QRCode.toDataURL(enrollment.totp.uri)
      if (!cancelled) { setFactorId(enrollment.id); setQrCode(image); setSecret(enrollment.totp.secret); setEnrolling(true) }
    }
    void loadFactor()
    return () => { cancelled = true }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const supabase = createClient()
    const { data, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (verifyError || !data?.session) { setError('The verification code is not valid.'); setBusy(false); return }
    window.location.assign('/')
  }

  return <main className="grid min-h-screen place-items-center bg-[#201d1b] px-4 text-[#f3eee5]"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[#453d38] bg-[#292522] p-7"><h1 className="font-serif text-3xl">{enrolling ? 'Set up your authenticator' : 'Verify your identity'}</h1><p className="mt-2 text-sm text-[#a09284]">{enrolling ? 'Scan this QR code with an authenticator app, then enter the six-digit code.' : 'Enter the code from your authenticator app.'}</p>{enrolling && qrCode && <div className="mt-6 flex flex-col items-center gap-3"><img src={qrCode} alt="Authenticator setup QR code" className="size-48 rounded-lg bg-white p-2" /><details className="w-full text-xs text-[#b7aa9b]"><summary className="cursor-pointer">Can&apos;t scan the code?</summary><code className="mt-2 block break-all rounded bg-[#201d1b] p-2 text-[#f3eee5]">{secret}</code></details></div>}<input aria-label="MFA code" autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} className="mt-7 w-full rounded-lg border border-[#51463f] bg-transparent px-3 py-3 text-center text-2xl tracking-[.5em] outline-none focus:ring-2 focus:ring-[#a27a76]" />{error && <p role="alert" className="mt-3 text-sm text-[#e5a9a5]">{error}</p>}<button disabled={busy || !factorId} className="mt-5 w-full rounded-lg bg-[#6d3d42] px-4 py-2.5 font-medium disabled:opacity-60">{busy ? 'Checking…' : enrolling ? 'Enable MFA' : 'Continue'}</button></form></main>
}
