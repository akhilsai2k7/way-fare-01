import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { findMatchingRides } from '@/lib/matching';
import {
  loadDemoState,
  saveDemoState,
  type DemoState,
} from '@/lib/demo-store';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase/client';
import type {
  Conversation,
  CreateRideInput,
  Message,
  Notification,
  Profile,
  ProfileInput,
  RatingInput,
  ReportInput,
  Ride,
  RideRequest,
  RideSearchFilters,
  RequestStatus,
  StoredRating,
  StoredReport,
  UserRole,
} from '@/types/carpool';

export type CarpoolUser = { id: string; email: string };

export type CarpoolContextValue = {
  user: CarpoolUser | null;
  profile: Profile | null;
  rides: Ride[];
  requests: RideRequest[];
  notifications: Notification[];
  conversations: Conversation[];
  messages: Message[];
  reports: StoredReport[];
  adminUsers: Profile[];
  blockedUserIds: string[];
  loading: boolean;
  error: string | null;
  backendMode: 'demo' | 'supabase';
  isBackendConfigured: boolean;
  clearError: () => void;
  enterDemo: (role?: UserRole) => void;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  searchRides: (filters: RideSearchFilters) => Promise<Ride[]>;
  createRide: (input: CreateRideInput) => Promise<Ride>;
  requestRide: (rideId: string, seats: number, message?: string) => Promise<void>;
  respondToRequest: (requestId: string, status: 'ACCEPTED' | 'REJECTED') => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  cancelRide: (rideId: string) => Promise<void>;
  completeRide: (rideId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  rateUser: (input: RatingInput) => Promise<void>;
  reportUser: (input: ReportInput) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  updateReportStatus: (
    reportId: string,
    status: StoredReport['status'],
  ) => Promise<void>;
  getRide: (id: string) => Promise<Ride | null>;
};

type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  home_location: string | null;
  preferred_transport: string | null;
  role: UserRole;
};

type DbRide = {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_avatar_url: string | null;
  origin: string;
  destination: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_date: string;
  departure_time: string;
  estimated_arrival_time: string | null;
  available_seats: number;
  total_seats: number;
  price: number | string;
  max_detour_km: number | string;
  status: Ride['status'];
  vehicle: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
};

type DbRequest = {
  id: string;
  ride_id: string;
  passenger_id: string;
  passenger_name: string;
  seats_requested: number;
  status: RequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

const CarpoolContext = createContext<CarpoolContextValue | null>(null);

function mapProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    homeLocation: row.home_location ?? undefined,
    preferredTransport: row.preferred_transport ?? undefined,
    role: row.role,
  };
}

function mapRide(row: DbRide): Ride {
  const vehicle = row.vehicle ?? {};
  return {
    id: row.id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    driverAvatar: row.driver_avatar_url ?? undefined,
    origin: row.origin,
    destination: row.destination,
    originLat: row.origin_lat,
    originLng: row.origin_lng,
    destinationLat: row.destination_lat,
    destinationLng: row.destination_lng,
    departureDate: row.departure_date,
    departureTime: row.departure_time.slice(0, 5),
    estimatedArrivalTime: row.estimated_arrival_time?.slice(0, 5) ?? undefined,
    availableSeats: row.available_seats,
    totalSeats: row.total_seats,
    price: Number(row.price),
    maxDetourKm: Number(row.max_detour_km),
    status: row.status,
    vehicle: {
      make: String(vehicle.make ?? 'Not specified'),
      model: String(vehicle.model ?? ''),
      color: typeof vehicle.color === 'string' ? vehicle.color : undefined,
      vehicleType: String(vehicle.vehicleType ?? vehicle.vehicle_type ?? 'Car'),
    },
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function mapRequest(row: DbRequest): RideRequest {
  return {
    id: row.id,
    rideId: row.ride_id,
    passengerId: row.passenger_id,
    passengerName: row.passenger_name,
    seatsRequested: row.seats_requested,
    status: row.status,
    message: row.message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: String(row.type),
    title: String(row.title),
    message: String(row.message),
    read: Boolean(row.read),
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}

function mapReport(row: Record<string, unknown>): StoredReport {
  return {
    id: String(row.id),
    reporterId: String(row.reporter_id),
    reportedUserId: row.reported_user_id ? String(row.reported_user_id) : undefined,
    rideId: row.ride_id ? String(row.ride_id) : undefined,
    reason: String(row.reason),
    description: typeof row.description === 'string' ? row.description : undefined,
    status: row.status as StoredReport['status'],
    createdAt: String(row.created_at),
  };
}

function getSafeError(error: unknown): string {
  const candidate = error as { code?: string; message?: string };
  const code = candidate?.code;
  const message = candidate?.message ?? '';
  const businessMessages = new Set([
    'Sign in to request a ride',
    'Choose between one and eight seats',
    'This ride is no longer available',
    'You cannot request your own ride',
    'There are not enough seats available',
    'This ride is not available to your account',
    'You already have an active request for this ride',
    'Sign in to respond to a request',
    'Choose ACCEPTED or REJECTED',
    'Ride request not found',
    'Only the driver can respond to this request',
    'This request has already been handled',
    'There are not enough seats available to accept this request',
    'Only pending requests can be cancelled',
    'This ride cannot be cancelled',
    'This ride cannot be completed',
    'Sign in to send a message',
    'This conversation is not available',
    'Ratings are available after a ride is completed',
    'The reviewed user did not take part in this ride',
    'Only ride participants can leave a rating',
    'Role and verification status can only be changed by an administrator',
    'Seat counts and ride status must be changed through ride actions',
    'You may only publish rides for your own account',
  ]);

  if (message.startsWith('Supabase is not configured.')) return message;
  if (businessMessages.has(message)) return message;
  if (code === '23505') return 'This action has already been completed.';
  if (code === '23514') return 'Some details are outside the allowed range.';
  if (code === 'PGRST205') {
    return 'Database tables not found. Please apply the migration in your Supabase SQL Editor.';
  }
  if (code === '42501' || code === 'PGRST301') {
    return 'You do not have permission to do that.';
  }
  return 'We could not complete that action. Please try again.';
}

function currentDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ensureValidRide(input: CreateRideInput): void {
  if (!input.origin.trim() || !input.destination.trim()) {
    throw new Error('Enter both a starting point and destination.');
  }
  if (input.origin.trim().toLowerCase() === input.destination.trim().toLowerCase()) {
    throw new Error('The starting point and destination must be different.');
  }
  if (!input.departureDate || input.departureDate < currentDate()) {
    throw new Error('Choose today or a future date.');
  }
  if (!input.departureTime) throw new Error('Choose a departure time.');
  if (!Number.isInteger(input.availableSeats) || input.availableSeats < 1 || input.availableSeats > 8) {
    throw new Error('Available seats must be between 1 and 8.');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Enter a valid contribution amount.');
  }
  if (!Number.isFinite(input.maxDetourKm) || input.maxDetourKm < 0) {
    throw new Error('Enter a valid detour limit.');
  }
  if (!input.vehicle.make.trim() || !input.vehicle.vehicleType.trim()) {
    throw new Error('Add the vehicle make and type.');
  }
}

export function CarpoolProvider({ children }: { children: ReactNode }) {
  const [demoState, setDemoState] = useState<DemoState>(() => loadDemoState());
  const [user, setUser] = useState<CarpoolUser | null>(() =>
    isSupabaseConfigured
      ? null
      : { id: demoState.profile.id, email: demoState.profile.email },
  );
  const [profile, setProfile] = useState<Profile | null>(() =>
    isSupabaseConfigured ? null : demoState.profile,
  );
  const [rides, setRides] = useState<Ride[]>(() =>
    isSupabaseConfigured ? [] : demoState.rides,
  );
  const [requests, setRequests] = useState<RideRequest[]>(() =>
    isSupabaseConfigured ? [] : demoState.requests,
  );
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    isSupabaseConfigured ? [] : demoState.notifications,
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    isSupabaseConfigured ? [] : demoState.conversations,
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    isSupabaseConfigured ? [] : demoState.messages,
  );
  const [reports, setReports] = useState<StoredReport[]>(() =>
    isSupabaseConfigured ? [] : demoState.reports,
  );
  const [adminUsers, setAdminUsers] = useState<Profile[]>(() =>
    isSupabaseConfigured ? [] : [demoState.profile],
  );
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() =>
    isSupabaseConfigured ? [] : demoState.blockedUserIds,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const persistDemo = useCallback((next: DemoState) => {
    saveDemoState(next);
    setDemoState(next);
    setRides(next.rides);
    setRequests(next.requests);
    setNotifications(next.notifications);
    setConversations(next.conversations);
    setMessages(next.messages);
    setReports(next.reports);
    setAdminUsers([next.profile]);
    setBlockedUserIds(next.blockedUserIds);
  }, []);

  const loadLiveData = useCallback(async (userId: string, email: string) => {
    const client = requireSupabase();
    setLoading(true);
    setError(null);

    try {
      let profileResult = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (profileResult.error) throw profileResult.error;

      if (!profileResult.data) {
        const { error: createProfileError } = await client.from('profiles').insert({
          id: userId,
          full_name: '',
          email,
          role: 'PASSENGER',
          is_verified: false,
        });
        if (createProfileError) throw createProfileError;
        profileResult = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
      }
      if (profileResult.error) throw profileResult.error;
      if (!profileResult.data) throw new Error('Profile setup did not finish.');

      const [
        ridesResult,
        requestsResult,
        notificationsResult,
        conversationsResult,
        messagesResult,
        ratingsResult,
        blockedResult,
        reportsResult,
        profilesResult,
      ] = await Promise.all([
        client
          .from('rides')
          .select('*')
          .order('departure_date', { ascending: false })
          .order('departure_time', { ascending: true })
          .limit(300),
        client.from('ride_requests').select('*').order('created_at', { ascending: false }).limit(500),
        client
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        client
          .from('conversations')
          .select('id,ride_id,created_at,conversation_members(user_id,display_name,avatar_url)')
          .order('created_at', { ascending: false })
          .limit(100),
        client
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
        client.from('ratings').select('reviewed_user_id,rating').limit(1000),
        client.from('blocked_users').select('blocked_user_id').eq('blocker_id', userId),
        client.from('reports').select('*').order('created_at', { ascending: false }).limit(500),
        client.from('profiles').select('*').order('created_at', { ascending: false }).limit(
          profileResult.data.role === 'ADMIN' ? 500 : 1,
        ),
      ]);

      const results = [
        ridesResult,
        requestsResult,
        notificationsResult,
        conversationsResult,
        messagesResult,
        ratingsResult,
        blockedResult,
        reportsResult,
        profilesResult,
      ];
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      const ratingTotals = new Map<string, { sum: number; count: number }>();
      for (const rating of ratingsResult.data ?? []) {
        const current = ratingTotals.get(rating.reviewed_user_id) ?? { sum: 0, count: 0 };
        current.sum += Number(rating.rating);
        current.count += 1;
        ratingTotals.set(rating.reviewed_user_id, current);
      }
      const mappedRides = ((ridesResult.data ?? []) as DbRide[]).map((row) => {
        const mapped = mapRide(row);
        const aggregate = ratingTotals.get(mapped.driverId);
        return aggregate
          ? { ...mapped, driverRating: Number((aggregate.sum / aggregate.count).toFixed(1)) }
          : mapped;
      });
      const mappedRequests = ((requestsResult.data ?? []) as DbRequest[]).map(mapRequest);
      const mappedMessages: Message[] = ((messagesResult.data ?? []) as Record<string, unknown>[])
        .map((row) => ({
          id: String(row.id),
          conversationId: String(row.conversation_id),
          senderId: String(row.sender_id),
          text: String(row.body),
          createdAt: String(row.created_at),
          readAt: row.read_at ? String(row.read_at) : undefined,
        }))
        .reverse();
      const mappedConversations: Conversation[] = (
        (conversationsResult.data ?? []) as Array<Record<string, unknown>>
      ).map((row) => {
        const members = Array.isArray(row.conversation_members)
          ? (row.conversation_members as Array<Record<string, unknown>>)
          : [];
        const participant = members.find((member) => member.user_id !== userId);
        const conversationMessages = mappedMessages.filter(
          (message) => message.conversationId === row.id,
        );
        const latest = conversationMessages.at(-1);
        return {
          id: String(row.id),
          rideId: row.ride_id ? String(row.ride_id) : undefined,
          participantName: String(participant?.display_name ?? 'Carpool partner'),
          participantAvatar:
            typeof participant?.avatar_url === 'string' ? participant.avatar_url : undefined,
          lastMessage: latest?.text,
          updatedAt: latest?.createdAt ?? String(row.created_at),
        };
      });

      const currentProfile = mapProfile(profileResult.data as DbProfile);
      const ownRatings = ratingTotals.get(userId);
      if (ownRatings) {
        currentProfile.rating = Number((ownRatings.sum / ownRatings.count).toFixed(1));
      }
      setProfile(currentProfile);
      setRides(mappedRides);
      setRequests(mappedRequests);
      setNotifications(
        ((notificationsResult.data ?? []) as Record<string, unknown>[]).map(mapNotification),
      );
      setConversations(mappedConversations);
      setMessages(mappedMessages);
      setReports(((reportsResult.data ?? []) as Record<string, unknown>[]).map(mapReport));
      setAdminUsers(((profilesResult.data ?? []) as DbProfile[]).map(mapProfile));
      setBlockedUserIds((blockedResult.data ?? []).map((row) => row.blocked_user_id));
    } catch (loadError) {
      setError(getSafeError(loadError));
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;

    const setSession = async (sessionUser: { id: string; email?: string } | null) => {
      if (!alive) return;
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setRides([]);
        setRequests([]);
        setNotifications([]);
        setConversations([]);
        setMessages([]);
        setReports([]);
        setAdminUsers([]);
        setBlockedUserIds([]);
        setLoading(false);
        return;
      }
      const activeUser = { id: sessionUser.id, email: sessionUser.email ?? '' };
      setUser(activeUser);
      try {
        await loadLiveData(activeUser.id, activeUser.email);
      } catch {
        // loadLiveData records the safe error for the UI.
      }
    };

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) {
        setError('We could not restore your session. Sign in again to continue.');
        setLoading(false);
        return;
      }
      void setSession(data.session?.user ?? null);
    });

    const { data: authSubscription } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => void setSession(session?.user ?? null));
    });

    const channel = client
      .channel('carpool-user-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          void client.auth.getUser().then(({ data: authData }) => {
            if (alive && authData.user) void loadLiveData(authData.user.id, authData.user.email ?? '');
          });
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void client.auth.getUser().then(({ data: authData }) => {
          if (alive && authData.user) void loadLiveData(authData.user.id, authData.user.email ?? '');
        });
      })
      .subscribe();

    return () => {
      alive = false;
      authSubscription.subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [loadLiveData]);

  const handleFailure = useCallback(
    (caught: unknown): never => {
      const friendly = getSafeError(caught);
      setError(friendly);
      throw new Error(friendly);
    },
    [],
  );

  const requireUser = useCallback(() => {
    if (!user) throw new Error('Sign in to continue.');
    return user;
  }, [user]);

  const enterDemo = useCallback(
    (role: UserRole = 'PASSENGER') => {
      if (isSupabaseConfigured) {
        setError('Demo mode is only available when Supabase is not configured.');
        return;
      }
      const next = { ...demoState, profile: { ...demoState.profile, role } };
      persistDemo(next);
      setProfile(next.profile);
      setAdminUsers([next.profile]);
      setUser({ id: next.profile.id, email: next.profile.email });
      setError(null);
    },
    [demoState, persistDemo],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!isSupabaseConfigured) {
        setError('Connect Supabase to create a real account. Demo mode uses local sample data only.');
        throw new Error('Connect Supabase to create a real account. Demo mode uses local sample data only.');
      }
      try {
        const client = requireSupabase();
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (authError) throw authError;
        if (data.user && data.session) {
          await loadLiveData(data.user.id, data.user.email ?? email);
          return true;
        } else {
          setError('Check your email to confirm your account, then sign in.');
          return false;
        }
      } catch (caught) {
        return handleFailure(caught);
      }
    },
    [handleFailure, loadLiveData],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Connect Supabase to sign in with a real account. Try the local demo instead.');
      }
      try {
        const { data, error: authError } = await requireSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email ?? email });
          await loadLiveData(data.user.id, data.user.email ?? email);
        }
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [handleFailure, loadLiveData],
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      const { error: authError } = await requireSupabase().auth.signOut();
      if (authError) handleFailure(authError);
      return;
    }
    setUser(null);
    setProfile(null);
    setError(null);
  }, [handleFailure]);

  const resetPasswordForEmail = useCallback(
    async (email: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }
      try {
        const client = requireSupabase();
        const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (resetError) throw resetError;
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [handleFailure],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.');
      }
      try {
        const client = requireSupabase();
        const { error: updateError } = await client.auth.updateUser({
          password,
        });
        if (updateError) throw updateError;
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [handleFailure],
  );

  const searchRides = useCallback(
    async (filters: RideSearchFilters) => {
      setError(null);
      let source = rides;
      if (isSupabaseConfigured) {
        try {
          const { data, error: queryError } = await requireSupabase()
            .from('rides')
            .select('*')
            .eq('status', 'SCHEDULED')
            .gte('departure_date', currentDate())
            .gt('available_seats', 0)
            .order('departure_date', { ascending: true })
            .order('departure_time', { ascending: true })
            .limit(300);
          if (queryError) throw queryError;
          source = ((data ?? []) as DbRide[]).map(mapRide);
        } catch (caught) {
          handleFailure(caught);
        }
      }
      return findMatchingRides(source, filters).filter(
        (ride) => ride.driverId !== user?.id && !blockedUserIds.includes(ride.driverId),
      );
    },
    [blockedUserIds, handleFailure, rides, user?.id],
  );

  const createRide = useCallback(
    async (input: CreateRideInput) => {
      setError(null);
      try {
        ensureValidRide(input);
        const activeUser = requireUser();
        if (isSupabaseConfigured) {
          const { data, error: createError } = await requireSupabase()
            .from('rides')
            .insert({
              driver_id: activeUser.id,
              origin: input.origin.trim(),
              destination: input.destination.trim(),
              origin_lat: input.originLat ?? null,
              origin_lng: input.originLng ?? null,
              destination_lat: input.destinationLat ?? null,
              destination_lng: input.destinationLng ?? null,
              departure_date: input.departureDate,
              departure_time: input.departureTime,
              estimated_arrival_time: input.estimatedArrivalTime || null,
              total_seats: input.availableSeats,
              available_seats: input.availableSeats,
              price: input.price,
              max_detour_km: input.maxDetourKm,
              vehicle: input.vehicle,
              notes: input.notes?.trim() || null,
              status: 'SCHEDULED',
            })
            .select('*')
            .single();
          if (createError) throw createError;
          const created = mapRide(data as DbRide);
          setRides((current) => [created, ...current]);
          if (user) await loadLiveData(user.id, user.email);
          return created;
        }

        const created: Ride = {
          ...input,
          id: `demo-ride-${crypto.randomUUID()}`,
          driverId: activeUser.id,
          driverName: profile?.fullName ?? 'Demo driver',
          driverAvatar: profile?.avatarUrl,
          totalSeats: input.availableSeats,
          availableSeats: input.availableSeats,
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
        };
        const next = { ...demoState, rides: [created, ...demoState.rides] };
        persistDemo(next);
        return created;
      } catch (caught) {
        return handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, profile, requireUser, user],
  );

  const requestRide = useCallback(
    async (rideId: string, seats: number, message = '') => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
          throw new Error('Choose between one and eight seats.');
        }
        if (isSupabaseConfigured) {
          const { error: requestError } = await requireSupabase().rpc('request_ride', {
            p_ride_id: rideId,
            p_seats_requested: seats,
            p_message: message.trim() || null,
          });
          if (requestError) throw requestError;
          if (user) await loadLiveData(user.id, user.email);
          return;
        }

        const ride = demoState.rides.find((item) => item.id === rideId);
        if (!ride || ride.status !== 'SCHEDULED') throw new Error('This ride is no longer available.');
        if (ride.driverId === activeUser.id) throw new Error('You cannot request your own ride.');
        if (ride.availableSeats < seats) throw new Error('There are not enough seats available.');
        if (
          demoState.requests.some(
            (item) =>
              item.rideId === rideId &&
              item.passengerId === activeUser.id &&
              (item.status === 'PENDING' || item.status === 'ACCEPTED'),
          )
        ) {
          throw new Error('You already have an active request for this ride.');
        }
        if (demoState.blockedUserIds.includes(ride.driverId)) {
          throw new Error('This ride is not available to your account.');
        }
        const createdAt = new Date().toISOString();
        const request: RideRequest = {
          id: `demo-request-${crypto.randomUUID()}`,
          rideId,
          passengerId: activeUser.id,
          passengerName: profile?.fullName ?? 'Demo passenger',
          seatsRequested: seats,
          status: 'PENDING',
          message: message.trim() || undefined,
          createdAt,
        };
        const notification: Notification = {
          id: `demo-notification-${crypto.randomUUID()}`,
          userId: ride.driverId,
          type: 'RIDE_REQUEST_RECEIVED',
          title: 'New ride request',
          message: `${request.passengerName} requested to join your ride.`,
          read: false,
          metadata: { rideId, requestId: request.id },
          createdAt,
        };
        const next = {
          ...demoState,
          requests: [request, ...demoState.requests],
          notifications: [notification, ...demoState.notifications],
        };
        persistDemo(next);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, profile, requireUser, user],
  );

  const respondToRequest = useCallback(
    async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (isSupabaseConfigured) {
          const { error: responseError } = await requireSupabase().rpc('respond_to_ride_request', {
            p_request_id: requestId,
            p_status: status,
          });
          if (responseError) throw responseError;
          if (user) await loadLiveData(user.id, user.email);
          return;
        }

        const request = demoState.requests.find((item) => item.id === requestId);
        const ride = request && demoState.rides.find((item) => item.id === request.rideId);
        if (!request || !ride) throw new Error('Ride request not found.');
        if (ride.driverId !== activeUser.id) throw new Error('Only the driver can respond to this request.');
        if (request.status !== 'PENDING') throw new Error('This request has already been handled.');
        if (status === 'ACCEPTED' && ride.availableSeats < request.seatsRequested) {
          throw new Error('There are not enough seats available to accept this request.');
        }
        const nextRequest = { ...request, status, updatedAt: new Date().toISOString() };
        const nextRide =
          status === 'ACCEPTED'
            ? { ...ride, availableSeats: ride.availableSeats - request.seatsRequested }
            : ride;
        const notification: Notification = {
          id: `demo-notification-${crypto.randomUUID()}`,
          userId: request.passengerId,
          type: `RIDE_REQUEST_${status}`,
          title: status === 'ACCEPTED' ? 'Ride request accepted' : 'Ride request declined',
          message:
            status === 'ACCEPTED'
              ? 'Your seat is confirmed. You can message the driver.'
              : 'The driver could not accept this request.',
          read: false,
          metadata: { rideId: ride.id, requestId },
          createdAt: new Date().toISOString(),
        };
        let nextConversations = demoState.conversations;
        let nextMessages = demoState.messages;
        if (status === 'ACCEPTED') {
          const conversation: Conversation = {
            id: `demo-conversation-${request.id}`,
            participantName: request.passengerId === activeUser.id ? ride.driverName : request.passengerName,
            participantAvatar:
              request.passengerId === activeUser.id ? ride.driverAvatar : undefined,
            rideId: ride.id,
            updatedAt: new Date().toISOString(),
          };
          nextConversations = [conversation, ...nextConversations];
          nextMessages = [
            {
              id: `demo-message-${crypto.randomUUID()}`,
              conversationId: conversation.id,
              senderId: activeUser.id,
              text: 'Your ride is confirmed. Message your carpool partner here.',
              createdAt: new Date().toISOString(),
            },
            ...nextMessages,
          ];
        }
        const next: DemoState = {
          ...demoState,
          rides: demoState.rides.map((item) => (item.id === ride.id ? nextRide : item)),
          requests: demoState.requests.map((item) => (item.id === request.id ? nextRequest : item)),
          notifications: [notification, ...demoState.notifications],
          conversations: nextConversations,
          messages: nextMessages,
        };
        persistDemo(next);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, requireUser, user],
  );

  const cancelRequest = useCallback(
    async (requestId: string) => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (isSupabaseConfigured) {
          const { error: cancelError } = await requireSupabase().rpc('cancel_ride_request', {
            p_request_id: requestId,
          });
          if (cancelError) throw cancelError;
          if (user) await loadLiveData(user.id, user.email);
          return;
        }
        const request = demoState.requests.find(
          (item) => item.id === requestId && item.passengerId === activeUser.id,
        );
        if (!request) throw new Error('Ride request not found.');
        if (request.status !== 'PENDING') throw new Error('Only pending requests can be cancelled.');
        const next: DemoState = {
          ...demoState,
          requests: demoState.requests.map((item) =>
            item.id === requestId ? { ...item, status: 'CANCELLED' } : item,
          ),
        };
        persistDemo(next);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, requireUser, user],
  );

  const updateRideStatus = useCallback(
    async (rideId: string, action: 'cancel' | 'complete') => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (isSupabaseConfigured) {
          const { error: statusError } = await requireSupabase().rpc(
            action === 'cancel' ? 'cancel_ride' : 'complete_ride',
            { p_ride_id: rideId },
          );
          if (statusError) throw statusError;
          if (user) await loadLiveData(user.id, user.email);
          return;
        }
        const ride = demoState.rides.find(
          (item) => item.id === rideId && item.driverId === activeUser.id,
        );
        if (!ride) throw new Error('Ride not found.');
        if (!['SCHEDULED', 'IN_PROGRESS'].includes(ride.status)) {
          throw new Error(action === 'cancel' ? 'This ride cannot be cancelled.' : 'This ride cannot be completed.');
        }
        const status = action === 'cancel' ? 'CANCELLED' : 'COMPLETED';
        let nextNotifications = demoState.notifications;
        if (action === 'complete') {
          const recipients = demoState.requests.filter(
            (item) => item.rideId === rideId && item.status === 'ACCEPTED',
          );
          nextNotifications = [
            ...recipients.map((recipient) => ({
              id: `demo-notification-${crypto.randomUUID()}`,
              userId: recipient.passengerId,
              type: 'RIDE_COMPLETED',
              title: 'Ride completed',
              message: 'You can now leave a rating for this trip.',
              read: false,
              metadata: { rideId },
              createdAt: new Date().toISOString(),
            })),
            ...nextNotifications,
          ];
        }
        const next: DemoState = {
          ...demoState,
          rides: demoState.rides.map((item) => (item.id === rideId ? { ...item, status } : item)),
          requests:
            action === 'cancel'
              ? demoState.requests.map((item) =>
                  item.rideId === rideId && ['PENDING', 'ACCEPTED'].includes(item.status)
                    ? { ...item, status: 'CANCELLED' }
                    : item,
                )
              : demoState.requests,
          notifications: nextNotifications,
        };
        persistDemo(next);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, requireUser, user],
  );

  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      setError(null);
      try {
        const activeUser = requireUser();
        const body = text.trim();
        if (!body || body.length > 4000) throw new Error('Enter a message under 4,000 characters.');
        if (isSupabaseConfigured) {
          const { error: messageError } = await requireSupabase().from('messages').insert({
            conversation_id: conversationId,
            sender_id: activeUser.id,
            body,
          });
          if (messageError) throw messageError;
          if (user) await loadLiveData(user.id, user.email);
          return;
        }
        const conversation = demoState.conversations.find((item) => item.id === conversationId);
        if (!conversation) throw new Error('This conversation is not available.');
        const createdAt = new Date().toISOString();
        const nextMessage: Message = {
          id: `demo-message-${crypto.randomUUID()}`,
          conversationId,
          senderId: activeUser.id,
          text: body,
          createdAt,
        };
        const next: DemoState = {
          ...demoState,
          messages: [...demoState.messages, nextMessage],
          conversations: demoState.conversations.map((item) =>
            item.id === conversationId ? { ...item, lastMessage: body, updatedAt: createdAt } : item,
          ),
        };
        persistDemo(next);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, requireUser, user],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (isSupabaseConfigured) {
          const { error: updateError } = await requireSupabase()
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .eq('user_id', activeUser.id);
          if (updateError) throw updateError;
          setNotifications((items) =>
            items.map((item) => (item.id === id ? { ...item, read: true } : item)),
          );
          return;
        }
        const next: DemoState = {
          ...demoState,
          notifications: demoState.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
        };
        persistDemo(next);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, persistDemo, requireUser],
  );

  const updateProfile = useCallback(
    async (input: ProfileInput) => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (!input.fullName.trim()) throw new Error('Your name is required.');
        if (isSupabaseConfigured) {
          const { data, error: updateError } = await requireSupabase()
            .from('profiles')
            .update({
              full_name: input.fullName.trim(),
              phone: input.phone?.trim() || null,
              avatar_url: input.avatarUrl?.trim() || null,
              bio: input.bio?.trim() || null,
              home_location: input.homeLocation?.trim() || null,
              preferred_transport: input.preferredTransport?.trim() || null,
            })
            .eq('id', activeUser.id)
            .select('*')
            .single();
          if (updateError) throw updateError;
          setProfile(mapProfile(data as DbProfile));
          if (user) await loadLiveData(user.id, user.email);
          return;
        }
        const nextProfile = { ...demoState.profile, ...input };
        const next: DemoState = { ...demoState, profile: nextProfile };
        persistDemo(next);
        setProfile(nextProfile);
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, requireUser, user],
  );

  const rateUser = useCallback(
    async (input: RatingInput) => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
          throw new Error('Choose a rating from 1 to 5.');
        }
        if (isSupabaseConfigured) {
          const { error: ratingError } = await requireSupabase().from('ratings').insert({
            ride_id: input.rideId,
            reviewer_id: activeUser.id,
            reviewed_user_id: input.reviewedUserId,
            rating: input.rating,
            review: input.review?.trim() || null,
          });
          if (ratingError) throw ratingError;
          if (user) await loadLiveData(user.id, user.email);
          return;
        }
        const duplicate = demoState.ratings.some(
          (rating) =>
            rating.rideId === input.rideId &&
            rating.reviewerId === activeUser.id &&
            rating.reviewedUserId === input.reviewedUserId,
        );
        if (duplicate) throw new Error('You have already rated this person for the ride.');
        const rating: StoredRating = {
          ...input,
          id: `demo-rating-${crypto.randomUUID()}`,
          reviewerId: activeUser.id,
          createdAt: new Date().toISOString(),
        };
        persistDemo({ ...demoState, ratings: [rating, ...demoState.ratings] });
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, loadLiveData, persistDemo, requireUser, user],
  );

  const reportUser = useCallback(
    async (input: ReportInput) => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (!input.reportedUserId && !input.rideId) {
          throw new Error('Choose a user or ride to report.');
        }
        if (!input.reason.trim()) throw new Error('Choose a reason for the report.');
        if (isSupabaseConfigured) {
          const { error: reportError } = await requireSupabase().from('reports').insert({
            reporter_id: activeUser.id,
            reported_user_id: input.reportedUserId ?? null,
            ride_id: input.rideId ?? null,
            reason: input.reason.trim(),
            description: input.description?.trim() || null,
          });
          if (reportError) throw reportError;
          return;
        }
        const report: StoredReport = {
          ...input,
          id: `demo-report-${crypto.randomUUID()}`,
          reporterId: activeUser.id,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        };
        persistDemo({ ...demoState, reports: [report, ...demoState.reports] });
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, persistDemo, requireUser],
  );

  const blockUser = useCallback(
    async (userId: string) => {
      setError(null);
      try {
        const activeUser = requireUser();
        if (userId === activeUser.id) throw new Error('You cannot block your own account.');
        if (isSupabaseConfigured) {
          const { error: blockError } = await requireSupabase().from('blocked_users').insert({
            blocker_id: activeUser.id,
            blocked_user_id: userId,
          });
          if (blockError) throw blockError;
          setBlockedUserIds((items) => [...new Set([...items, userId])]);
          return;
        }
        if (demoState.blockedUserIds.includes(userId)) return;
        const nextBlocked = [...demoState.blockedUserIds, userId];
        persistDemo({ ...demoState, blockedUserIds: nextBlocked });
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, persistDemo, requireUser],
  );

  const updateReportStatus = useCallback(
    async (reportId: string, status: StoredReport['status']) => {
      setError(null);
      try {
        requireUser();
        if (profile?.role !== 'ADMIN') {
          throw new Error('Only community administrators can review reports.');
        }
        if (isSupabaseConfigured) {
          const { data, error: updateError } = await requireSupabase()
            .from('reports')
            .update({ status })
            .eq('id', reportId)
            .select('*')
            .single();
          if (updateError) throw updateError;
          const updated = mapReport(data as Record<string, unknown>);
          setReports((current) =>
            current.map((report) => (report.id === reportId ? updated : report)),
          );
          return;
        }
        const found = demoState.reports.some((report) => report.id === reportId);
        if (!found) throw new Error('Report not found.');
        persistDemo({
          ...demoState,
          reports: demoState.reports.map((report) =>
            report.id === reportId ? { ...report, status } : report,
          ),
        });
      } catch (caught) {
        handleFailure(caught);
      }
    },
    [demoState, handleFailure, persistDemo, profile, requireUser],
  );

  const getRide = useCallback(
    async (id: string): Promise<Ride | null> => {
      const cached = rides.find((ride) => ride.id === id);
      if (cached) return cached;
      if (!isSupabaseConfigured) return null;
      try {
        const { data, error: queryError } = await requireSupabase()
          .from('rides')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (queryError) throw queryError;
        return data ? mapRide(data as DbRide) : null;
      } catch (caught) {
        return handleFailure(caught);
      }
    },
    [handleFailure, rides],
  );

  const value = useMemo<CarpoolContextValue>(
    () => ({
      user,
      profile,
      rides,
      requests,
      notifications,
      conversations,
      messages,
      reports,
      adminUsers,
      blockedUserIds,
      loading,
      error,
      backendMode: isSupabaseConfigured ? 'supabase' : 'demo',
      isBackendConfigured: isSupabaseConfigured,
      clearError: () => setError(null),
      enterDemo,
      signUp,
      signIn,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      searchRides,
      createRide,
      requestRide,
      respondToRequest,
      cancelRequest,
      cancelRide: (rideId) => updateRideStatus(rideId, 'cancel'),
      completeRide: (rideId) => updateRideStatus(rideId, 'complete'),
      sendMessage,
      markNotificationRead,
      updateProfile,
      rateUser,
      reportUser,
      blockUser,
      updateReportStatus,
      getRide,
    }),
    [
      user,
      profile,
      rides,
      requests,
      notifications,
      conversations,
      messages,
      reports,
      adminUsers,
      blockedUserIds,
      loading,
      error,
      enterDemo,
      signUp,
      signIn,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      searchRides,
      createRide,
      requestRide,
      respondToRequest,
      cancelRequest,
      updateRideStatus,
      sendMessage,
      markNotificationRead,
      updateProfile,
      rateUser,
      reportUser,
      blockUser,
      updateReportStatus,
      getRide,
    ],
  );

  return <CarpoolContext.Provider value={value}>{children}</CarpoolContext.Provider>;
}

export function useCarpool(): CarpoolContextValue {
  const context = useContext(CarpoolContext);
  if (!context) throw new Error('useCarpool must be used within CarpoolProvider.');
  return context;
}
