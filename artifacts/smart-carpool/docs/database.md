# Database and migration

The Supabase schema is defined in
`supabase/migrations/20261006000000_initial_schema.sql`.

## Apply the schema

For an existing Supabase project, either:

- Run the migration contents in the Supabase SQL Editor; or
- Install the Supabase CLI, link the repository to the intended project, and
  run `supabase db push`.

Review the target project before applying schema changes. The migration creates
the app's `public` tables, indexes, triggers, RLS policies, RPC functions, and
Realtime publication entries. It is an initial migration, not an automatic
schema reconciliation tool.

## Tables

- `profiles`: application profile and role, keyed to `auth.users`.
- `vehicles`: vehicle records owned by a profile. The current ride form stores
  a compact vehicle snapshot on each ride.
- `rides`: route labels and optional coordinates, time, seats, contribution,
  vehicle snapshot, and status.
- `ride_requests`: passenger seat requests and their state.
- `ride_passengers`: confirmed ride participants.
- `conversations`, `conversation_members`, and `messages`: ride-linked private
  conversations.
- `notifications`: user-specific events.
- `ratings`: participant-to-participant ratings for completed rides.
- `reports`: user- or ride-related reports and moderation status.
- `blocked_users`: one-way block records, checked in both directions when a
  ride is requested.

## Atomic ride requests

`request_ride` validates the signed-in user, ride state, seat count, blocks, and
duplicate active requests while locking the ride row. `respond_to_ride_request`
locks the request and ride, checks the remaining seats, then decrements seats
and adds the passenger before accepting. These related writes run within the
function transaction. The UI never edits available seats directly.

Other database functions cancel a pending request, cancel a ride, and complete
a ride. Triggers create notifications and start a conversation when a request
is accepted.

## First administrator

New accounts receive the `PASSENGER` role. Promote the first trusted admin
directly in the Supabase SQL Editor, using that user's Auth UUID:

```sql
update public.profiles
set role = 'ADMIN'
where id = 'AUTH_USER_UUID';
```

Do not expose this operation through a public app form. The profile trigger
rejects role and verification changes through ordinary user updates; database
RLS checks administrator access for moderation operations.
