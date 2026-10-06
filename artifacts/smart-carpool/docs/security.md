# Security model

## Authentication and authorization

- Supabase Auth owns real account creation, sign-in, sign-out, and sessions.
- Every application table has RLS enabled. Policies scope profile, request,
  conversation, message, notification, rating, report, and block access.
- Admin visibility and report updates are enforced in Postgres as well as
  hidden or restricted in the UI. The client role check is not the security
  boundary.
- Privileged ride operations are implemented as narrowly scoped database
  functions. Public and anonymous execution is revoked; authenticated users
  must still pass the function's ownership and state checks.
- Profile updates cannot change a user's role or verification flag. Ride status
  and available seat counts cannot be edited directly by ordinary users.

## Secrets and browser configuration

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
compiled into the browser bundle by design. RLS is required; the publishable
key is not an authorization mechanism. Keep service-role keys, database
passwords, and other privileged credentials out of client variables and Git.

## Demo data boundary

Demo mode is used only when the Supabase URL or publishable key is absent. It
stores synthetic data in this browser's local storage. It is not a shared
account or backup and is never used as a fallback when live requests fail.
Configure Supabase to switch to live mode.

## Trust and moderation limits

- Identity verification is not implemented. New profiles default to
  `is_verified = false`; the interface avoids presenting users as verified.
- Ratings can be submitted only by ride participants after completion, and a
  participant can rate a given peer once for that ride.
- A block prevents ride requests between the two accounts. Existing
  conversations are not automatically deleted.
- The admin console supports report review and profile visibility. It is not a
  full account suspension, appeal, or law-enforcement workflow.

Before using the app with real commuters, configure Supabase Auth redirects,
review the RLS policies for the intended product, and test permissions with
separate passenger, driver, and admin accounts.
