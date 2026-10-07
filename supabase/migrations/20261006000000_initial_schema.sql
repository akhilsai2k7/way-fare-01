-- Smart Carpooling Platform schema for Supabase.
-- Apply with `supabase db push` or paste this migration into the Supabase SQL editor.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  bio text,
  home_location text,
  preferred_transport text,
  role text not null default 'PASSENGER'
    check (role in ('PASSENGER', 'DRIVER', 'ADMIN')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  make text not null,
  model text not null,
  color text,
  license_plate text,
  vehicle_type text not null default 'Car',
  created_at timestamptz not null default now()
);

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  driver_name text not null default '',
  driver_avatar_url text,
  origin text not null,
  destination text not null,
  origin_lat double precision,
  origin_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  departure_date date not null,
  departure_time time not null,
  estimated_arrival_time time,
  total_seats integer not null check (total_seats between 1 and 8),
  available_seats integer not null check (available_seats between 0 and 8),
  price numeric(9, 2) not null default 0 check (price >= 0),
  max_detour_km numeric(6, 2) not null default 5 check (max_detour_km >= 0),
  vehicle jsonb not null default '{"make":"Not specified","model":"","vehicleType":"Car"}'::jsonb,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rides_available_not_above_total check (available_seats <= total_seats),
  constraint rides_distinct_route check (lower(trim(origin)) <> lower(trim(destination)))
);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  passenger_name text not null default '',
  seats_requested integer not null check (seats_requested between 1 and 8),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ride_passengers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seats integer not null check (seats between 1 and 8),
  joined_at timestamptz not null default now(),
  unique (ride_id, passenger_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ride_id, passenger_id)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  constraint ratings_distinct_users check (reviewer_id <> reviewed_user_id),
  unique (ride_id, reviewer_id, reviewed_user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  ride_id uuid references public.rides(id) on delete set null,
  reason text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  constraint reports_have_subject check (reported_user_id is not null or ride_id is not null)
);

create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocked_users_distinct check (blocker_id <> blocked_user_id),
  unique (blocker_id, blocked_user_id)
);

create index rides_departure_date_status_idx on public.rides (departure_date, status);
create index rides_driver_id_idx on public.rides (driver_id);
create index rides_route_search_idx on public.rides (lower(origin), lower(destination));
create index rides_origin_lat_lng_idx on public.rides (origin_lat, origin_lng);
create index rides_destination_lat_lng_idx on public.rides (destination_lat, destination_lng);
create index ride_requests_ride_id_status_idx on public.ride_requests (ride_id, status);
create index ride_requests_passenger_id_idx on public.ride_requests (passenger_id);
create index ride_passengers_passenger_id_idx on public.ride_passengers (passenger_id);
create index conversations_passenger_id_idx on public.conversations (passenger_id);
create index conversation_members_user_id_idx on public.conversation_members (user_id);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index ratings_reviewed_user_idx on public.ratings (reviewed_user_id);
create index reports_status_created_idx on public.reports (status, created_at desc);

create unique index ride_requests_one_open_per_passenger_idx
  on public.ride_requests (ride_id, passenger_id)
  where status in ('PENDING', 'ACCEPTED');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'ADMIN'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role')
     and not public.is_admin()
     and (new.role is distinct from old.role or new.is_verified is distinct from old.is_verified) then
    raise exception 'Role and verification status can only be changed by an administrator';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_privileges
before update on public.profiles
for each row execute function public.guard_profile_privileges();

create or replace function public.snapshot_ride_driver()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  driver_profile public.profiles%rowtype;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.driver_id <> auth.uid() and not public.is_admin() then
      raise exception 'You may only publish rides for your own account';
    end if;
    select * into driver_profile from public.profiles where id = new.driver_id;
    if not found then
      raise exception 'Driver profile not found';
    end if;
    new.driver_name := driver_profile.full_name;
    new.driver_avatar_url := driver_profile.avatar_url;
    new.available_seats := new.total_seats;
    new.updated_at := now();
    return new;
  end if;

  if current_user not in ('postgres', 'service_role') and not public.is_admin()
     and (new.driver_id is distinct from old.driver_id
       or new.available_seats is distinct from old.available_seats
       or new.total_seats is distinct from old.total_seats
       or new.status is distinct from old.status) then
    raise exception 'Seat counts and ride status must be changed through ride actions';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger rides_snapshot_driver
before insert or update on public.rides
for each row execute function public.snapshot_ride_driver();

create or replace function public.snapshot_request_passenger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select p.full_name into new.passenger_name
    from public.profiles p
    where p.id = new.passenger_id;
    if not found then
      raise exception 'Passenger profile not found';
    end if;
    return new;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger ride_requests_snapshot_passenger
before insert or update on public.ride_requests
for each row execute function public.snapshot_request_passenger();

create or replace function public.notify_ride_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride_driver_id uuid;
begin
  select r.driver_id into ride_driver_id from public.rides r where r.id = new.ride_id;
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      ride_driver_id,
      'RIDE_REQUEST_RECEIVED',
      'New ride request',
      new.passenger_name || ' requested to join your ride.',
      jsonb_build_object('rideId', new.ride_id, 'requestId', new.id)
    );
  elsif old.status is distinct from new.status and new.status in ('ACCEPTED', 'REJECTED', 'CANCELLED') then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      new.passenger_id,
      'RIDE_REQUEST_' || new.status,
      case new.status
        when 'ACCEPTED' then 'Ride request accepted'
        when 'REJECTED' then 'Ride request declined'
        else 'Ride request cancelled'
      end,
      case new.status
        when 'ACCEPTED' then 'Your seat is confirmed.'
        when 'REJECTED' then 'The driver could not accept this request.'
        else 'The request is no longer active.'
      end,
      jsonb_build_object('rideId', new.ride_id, 'requestId', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger ride_request_notifications
after insert or update of status on public.ride_requests
for each row execute function public.notify_ride_request_change();

create or replace function public.start_ride_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride_driver_id uuid;
  conversation_id uuid;
begin
  if new.status <> 'ACCEPTED' or old.status = 'ACCEPTED' then
    return new;
  end if;

  select r.driver_id into ride_driver_id from public.rides r where r.id = new.ride_id;
  insert into public.conversations (ride_id, passenger_id)
  values (new.ride_id, new.passenger_id)
  on conflict (ride_id, passenger_id) do update set ride_id = excluded.ride_id
  returning id into conversation_id;

  insert into public.conversation_members (conversation_id, user_id, display_name, avatar_url)
  select conversation_id, p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id in (ride_driver_id, new.passenger_id)
  on conflict (conversation_id, user_id) do nothing;

  return new;
end;
$$;

create trigger ride_request_start_conversation
after update of status on public.ride_requests
for each row execute function public.start_ride_conversation();

create or replace function public.request_ride(
  p_ride_id uuid,
  p_seats_requested integer,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  ride_row public.rides%rowtype;
  new_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to request a ride';
  end if;
  if p_seats_requested < 1 or p_seats_requested > 8 then
    raise exception 'Choose between one and eight seats';
  end if;

  select * into ride_row
  from public.rides
  where id = p_ride_id
  for update;

  if not found or ride_row.status <> 'SCHEDULED' then
    raise exception 'This ride is no longer available';
  end if;
  if ride_row.driver_id = current_user_id then
    raise exception 'You cannot request your own ride';
  end if;
  if ride_row.available_seats < p_seats_requested then
    raise exception 'There are not enough seats available';
  end if;
  if exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = current_user_id and b.blocked_user_id = ride_row.driver_id)
       or (b.blocker_id = ride_row.driver_id and b.blocked_user_id = current_user_id)
  ) then
    raise exception 'This ride is not available to your account';
  end if;
  if exists (
    select 1 from public.ride_requests rr
    where rr.ride_id = p_ride_id
      and rr.passenger_id = current_user_id
      and rr.status in ('PENDING', 'ACCEPTED')
  ) then
    raise exception 'You already have an active request for this ride';
  end if;

  insert into public.ride_requests (ride_id, passenger_id, seats_requested, message)
  values (p_ride_id, current_user_id, p_seats_requested, nullif(trim(p_message), ''))
  returning id into new_request_id;
  return new_request_id;
end;
$$;

create or replace function public.respond_to_ride_request(
  p_request_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.ride_requests%rowtype;
  ride_row public.rides%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to respond to a request';
  end if;
  if p_status not in ('ACCEPTED', 'REJECTED') then
    raise exception 'Choose ACCEPTED or REJECTED';
  end if;

  select * into request_row
  from public.ride_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Ride request not found';
  end if;

  select * into ride_row
  from public.rides
  where id = request_row.ride_id
  for update;
  if ride_row.driver_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the driver can respond to this request';
  end if;
  if request_row.status <> 'PENDING' then
    raise exception 'This request has already been handled';
  end if;

  if p_status = 'ACCEPTED' then
    if ride_row.status <> 'SCHEDULED' or ride_row.available_seats < request_row.seats_requested then
      raise exception 'There are not enough seats available to accept this request';
    end if;
    update public.rides
    set available_seats = available_seats - request_row.seats_requested
    where id = ride_row.id;

    insert into public.ride_passengers (ride_id, passenger_id, seats)
    values (ride_row.id, request_row.passenger_id, request_row.seats_requested)
    on conflict (ride_id, passenger_id) do update
      set seats = excluded.seats, joined_at = now();
  end if;

  update public.ride_requests
  set status = p_status
  where id = request_row.id;
  return p_status;
end;
$$;

create or replace function public.cancel_ride_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.ride_requests%rowtype;
begin
  select * into request_row
  from public.ride_requests
  where id = p_request_id
  for update;
  if not found or request_row.passenger_id <> auth.uid() then
    raise exception 'Ride request not found';
  end if;
  if request_row.status <> 'PENDING' then
    raise exception 'Only pending requests can be cancelled';
  end if;
  update public.ride_requests set status = 'CANCELLED' where id = p_request_id;
end;
$$;

create or replace function public.cancel_ride(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride_row public.rides%rowtype;
begin
  select * into ride_row from public.rides where id = p_ride_id for update;
  if not found or (ride_row.driver_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Ride not found';
  end if;
  if ride_row.status not in ('SCHEDULED', 'IN_PROGRESS') then
    raise exception 'This ride cannot be cancelled';
  end if;
  update public.rides set status = 'CANCELLED' where id = p_ride_id;
  update public.ride_requests
  set status = 'CANCELLED'
  where ride_id = p_ride_id and status in ('PENDING', 'ACCEPTED');
end;
$$;

create or replace function public.complete_ride(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride_row public.rides%rowtype;
begin
  select * into ride_row from public.rides where id = p_ride_id for update;
  if not found or (ride_row.driver_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Ride not found';
  end if;
  if ride_row.status not in ('SCHEDULED', 'IN_PROGRESS') then
    raise exception 'This ride cannot be completed';
  end if;
  update public.rides set status = 'COMPLETED' where id = p_ride_id;
  insert into public.notifications (user_id, type, title, message, metadata)
  select rp.passenger_id, 'RIDE_COMPLETED', 'Ride completed', 'You can now leave a rating for this trip.',
         jsonb_build_object('rideId', p_ride_id)
  from public.ride_passengers rp
  where rp.ride_id = p_ride_id;
end;
$$;

create or replace function public.guard_rating_relationship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride_driver uuid;
begin
  if new.reviewer_id <> auth.uid() then
    raise exception 'Ratings must be submitted by the signed-in user';
  end if;
  select r.driver_id into ride_driver
  from public.rides r
  where r.id = new.ride_id and r.status = 'COMPLETED';
  if not found then
    raise exception 'Ratings are available after a ride is completed';
  end if;
  if new.reviewed_user_id <> ride_driver and not exists (
    select 1 from public.ride_passengers rp
    where rp.ride_id = new.ride_id and rp.passenger_id = new.reviewed_user_id
  ) then
    raise exception 'The reviewed user did not take part in this ride';
  end if;
  if new.reviewer_id <> ride_driver and not exists (
    select 1 from public.ride_passengers rp
    where rp.ride_id = new.ride_id and rp.passenger_id = new.reviewer_id
  ) then
    raise exception 'Only ride participants can leave a rating';
  end if;
  return new;
end;
$$;

create trigger ratings_validate_participants
before insert on public.ratings
for each row execute function public.guard_rating_relationship();

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.metadata is distinct from old.metadata then
    raise exception 'Only the read status can be updated';
  end if;
  return new;
end;
$$;

create trigger notifications_read_only_content
before update on public.notifications
for each row execute function public.guard_notification_update();

create or replace function public.guard_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.conversation_id is distinct from old.conversation_id
     or new.sender_id is distinct from old.sender_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'Messages cannot be edited';
  end if;
  if new.read_at is distinct from old.read_at
     and old.sender_id = auth.uid()
     and not public.is_admin() then
    raise exception 'Only the other conversation member can mark this message as read';
  end if;
  return new;
end;
$$;

create trigger messages_immutable_content
before update on public.messages
for each row execute function public.guard_message_update();

create or replace function public.has_conversation_access(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation
      and cm.user_id = (select auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_requests enable row level security;
alter table public.ride_passengers enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'PASSENGER'
    and is_verified = false
  );
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

create policy vehicles_owner_select on public.vehicles
  for select to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy vehicles_owner_insert on public.vehicles
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy vehicles_owner_update on public.vehicles
  for update to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy vehicles_owner_delete on public.vehicles
  for delete to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));

create policy rides_read_available_or_owned on public.rides
  for select to authenticated
  using (status <> 'CANCELLED' or driver_id = (select auth.uid()) or (select public.is_admin()));
create policy rides_create_self on public.rides
  for insert to authenticated with check (driver_id = (select auth.uid()));
create policy rides_update_owner_or_admin on public.rides
  for update to authenticated
  using (driver_id = (select auth.uid()) or (select public.is_admin()))
  with check (driver_id = (select auth.uid()) or (select public.is_admin()));
create policy rides_delete_admin on public.rides
  for delete to authenticated using ((select public.is_admin()));

create policy ride_requests_participant_select on public.ride_requests
  for select to authenticated
  using (
    passenger_id = (select auth.uid())
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy ride_requests_admin_update on public.ride_requests
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy ride_passengers_participant_select on public.ride_passengers
  for select to authenticated
  using (
    passenger_id = (select auth.uid())
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy conversations_member_select on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = id and cm.user_id = (select auth.uid())
    )
    or (select public.is_admin())
  );
create policy conversation_members_member_select on public.conversation_members
  for select to authenticated
  using (public.has_conversation_access(conversation_id) or (select public.is_admin()));
create policy messages_member_select on public.messages
  for select to authenticated
  using (public.has_conversation_access(conversation_id) or (select public.is_admin()));
create policy messages_member_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.has_conversation_access(conversation_id)
  );
create policy messages_member_mark_read on public.messages
  for update to authenticated
  using (public.has_conversation_access(conversation_id) or (select public.is_admin()))
  with check (public.has_conversation_access(conversation_id) or (select public.is_admin()));

create policy notifications_owner_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy notifications_owner_update on public.notifications
  for update to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy ratings_read_authenticated on public.ratings
  for select to authenticated using (true);
create policy ratings_insert_self on public.ratings
  for insert to authenticated with check (reviewer_id = (select auth.uid()));

create policy reports_create_self on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_read_reporter_or_admin on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy reports_admin_update on public.reports
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy blocked_users_owner_select on public.blocked_users
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocked_users_owner_insert on public.blocked_users
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy blocked_users_owner_delete on public.blocked_users
  for delete to authenticated using (blocker_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.rides to authenticated;
grant select, insert, update, delete on public.ride_requests to authenticated;
grant select, insert, update, delete on public.ride_passengers to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_members to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant select, insert, update, delete on public.blocked_users to authenticated;

revoke all on function public.request_ride(uuid, integer, text) from public, anon;
revoke all on function public.respond_to_ride_request(uuid, text) from public, anon;
revoke all on function public.cancel_ride_request(uuid) from public, anon;
revoke all on function public.cancel_ride(uuid) from public, anon;
revoke all on function public.complete_ride(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.guard_profile_privileges() from public, anon, authenticated;
revoke all on function public.snapshot_ride_driver() from public, anon, authenticated;
revoke all on function public.snapshot_request_passenger() from public, anon, authenticated;
revoke all on function public.notify_ride_request_change() from public, anon, authenticated;
revoke all on function public.start_ride_conversation() from public, anon, authenticated;
revoke all on function public.guard_rating_relationship() from public, anon, authenticated;
revoke all on function public.guard_notification_update() from public, anon, authenticated;
revoke all on function public.guard_message_update() from public, anon, authenticated;
revoke all on function public.has_conversation_access(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_conversation_access(uuid) to authenticated;

grant execute on function public.request_ride(uuid, integer, text) to authenticated;
grant execute on function public.respond_to_ride_request(uuid, text) to authenticated;
grant execute on function public.cancel_ride_request(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid) to authenticated;
grant execute on function public.complete_ride(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object or undefined_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object or undefined_object then
  null;
end $$;
