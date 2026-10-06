# Architecture

## Runtime

The app is a React + Vite single-page web app in the
`@workspace/smart-carpool` package. Wouter handles client routes, and the
existing artifact workflow serves the app at `/`. The production artifact is
static; Supabase provides authentication, persistence, realtime changes, and
database-side authorization.

The existing Replit API server and database are intentionally not part of this
product's data path. The browser uses Supabase's publishable key and the signed
in user's session. There is no service-role key in the frontend.

## Data flow

1. On startup, the app restores the Supabase session when Supabase is
   configured. It loads the signed-in user's visible profiles, rides, requests,
   conversations, messages, notifications, reports, ratings, and blocks.
2. Supabase Auth creates the base profile through a database trigger. The app
   can complete profile setup for an existing auth user if that row is missing.
3. Search filters rides and calculates an approximate route/time/seat score in
   `src/lib/matching.ts`.
4. Ride requests, responses, cancellations, and completion use database
   functions or RLS-protected updates. Accepting a request updates the available
   seat count in the same database transaction and creates the conversation.
5. Realtime notifications and message changes trigger a refresh for the
   current signed-in user.
6. When Supabase is not configured, the app loads a separate sample store from
   browser `localStorage`. It does not fall back to that store after a live
   Supabase error.

## Main areas

- `src/App.tsx`: routes, forms, dashboards, and interaction UI.
- `src/lib/carpool-context.tsx`: auth-aware state and app operations.
- `src/lib/demo-store.ts`: browser-local sample data and persistence.
- `src/lib/matching.ts`: approximate route and preference matching.
- `src/lib/supabase/client.ts`: browser Supabase client configuration.
- `supabase/migrations/`: schema, policies, triggers, and database functions.

## Matching limits

Route similarity is calculated from normalized origin and destination labels
and overlapping words. Time, requested seats, contribution, detour tolerance,
and vehicle type are also considered. It does not calculate road distance,
pickup geometry, traffic, or travel time. A match score is a ranking aid, not a
guarantee that two journeys share a practical route.
