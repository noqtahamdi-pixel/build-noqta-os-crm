# NOQTA OS

Internal operations, costing and customer CRM for NOQTA.

## Setup

1. Install dependencies with `pnpm install`.
2. Ensure the Vercel/Supabase integration provides `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Create users in Supabase Auth; there is intentionally no public sign-up route.
4. Set each user's role in `app_metadata.role` to `owner`, `finance`, `operations`, `production`, or `viewer`.
5. Run the app with `pnpm dev`.

## Assumptions

- The Supabase database and seed data already exist; this app does not run SQL or migrations.
- The current screens are the Phase 0 read-only foundation. Catalog starts empty and cost categories mirror the seeded taxonomy.
- The preview uses an owner shell until server session wiring is connected to the signed-in Supabase user. Role enforcement belongs in the server guard before production access.
- English is the default UI language; the visible switcher demonstrates Arabic copy and RTL layout. Persisting the choice per user will use the authenticated profile in the next app phase.
- MFA enrollment and challenge UI is reserved for the auth route surface; TOTP is required for owner and finance before production rollout.

## Environment variables read

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (optional)

No service-role key is read by browser code.
