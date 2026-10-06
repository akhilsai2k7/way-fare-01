# Wayfare — Smart Carpooling Platform

Wayfare is a responsive carpooling app for commuters who want to offer seats,
find rides on similar routes, coordinate requests, and keep ride conversations
in one place.

## Current implementation

- React + Vite frontend in the existing Replit web artifact.
- Supabase Auth and Postgres for live accounts and shared data.
- Row Level Security (RLS) and database functions protect user data and
  operations that change seat counts.
- Browser-local demo mode when Supabase is not configured. Demo records stay in
  this browser's local storage and are never copied into a live project.
- Route matching uses text labels, departure date/time, available seats, price,
  detour limit, and vehicle type. It is an approximate match, not a maps or
  navigation service.

## Run locally

From the repository root:

```sh
pnpm install
pnpm --filter @workspace/smart-carpool run dev
```

Without Supabase configuration, the app opens in clearly labeled demo mode.
Use **Continue as demo commuter** or **Open demo admin** on `/auth` to switch
between the sample roles. Data changes persist only in this browser. Clear the
site's local storage to reset the demo.

To run the production build locally:

```sh
pnpm --filter @workspace/smart-carpool run typecheck
pnpm --filter @workspace/smart-carpool run build
```

## Enable live Supabase mode

1. Create a Supabase project.
2. Apply the SQL migration in
   `supabase/migrations/20261006000000_initial_schema.sql`. See
   [Database setup](docs/database.md).
3. Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Copy `.env.example` to `.env.local`
   for local work, or set them as Replit environment variables.
4. Configure Supabase Auth's site URL and allowed redirect URLs for both the
   development app and its published domain.
5. Restart the web workflow or rebuild after changing environment values.

Only the Supabase **publishable** key belongs in the browser. Never put a
service-role key in a `NEXT_PUBLIC_` variable, source file, or client bundle.
More detail is in [Deployment](docs/deployment.md).

## Guides

- [Architecture](docs/architecture.md)
- [Database and migration](docs/database.md)
- [Security model](docs/security.md)
- [Deployment](docs/deployment.md)

## Important scope notes

- This artifact uses Supabase directly; it does not use the shared Replit API
  server or Replit database for carpool data.
- Identity verification is not implemented. The app does not treat a profile,
  rating, or successful sign-in as proof of identity.
- Ratings are only accepted for participants after a ride is completed.
- Supabase live behavior still needs to be verified against a configured
  project after the migration and Auth URLs are set up.
