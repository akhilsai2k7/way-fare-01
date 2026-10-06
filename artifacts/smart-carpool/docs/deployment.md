# Deployment

## Supabase configuration

1. Create a Supabase project and apply the migration described in
   [Database setup](database.md).
2. Add these values to Replit Secrets (or to `.env.local` for local development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Configure Supabase Auth's site URL and allowed redirect URLs to include the
   development app URL and published app URL.
4. Promote the first trusted administrator from the Supabase SQL Editor.

These `NEXT_PUBLIC_` values are public browser configuration and are embedded
at build time. Only use a Supabase publishable key. Never expose the
service-role key.

## Replit build

The `artifacts/smart-carpool: web` workflow starts Vite for development. The
artifact's production service builds the static app from
`pnpm --filter @workspace/smart-carpool run build` and serves
`artifacts/smart-carpool/dist/public`, with a fallback rewrite to `index.html`
for client-side routes.

After setting or changing Supabase environment values, restart the web
workflow for development and rebuild before publishing. Confirm the mode pill
shows **Live mode** after configuration. If either required value is absent,
the app intentionally stays in clearly labeled browser-local demo mode.

## Verification checklist

- Apply the migration to the intended Supabase project.
- Sign up, confirm email if required, sign in, edit a profile, and sign out.
- Check that users cannot read another user's private profile, notifications,
  conversations, or reports.
- Request seats from two separate accounts and verify that accepting one
  request cannot oversell the ride.
- Verify ride cancellation, message membership, report review, blocking, and
  post-completion ratings with role-appropriate accounts.
- Run the typecheck and production build before publishing.

Live Supabase behavior has not been tested until a project is configured and
this checklist is run against it.
