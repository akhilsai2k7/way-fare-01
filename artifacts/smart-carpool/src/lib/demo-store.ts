import type {
  Conversation,
  Message,
  Notification,
  Profile,
  Ride,
  RideRequest,
  StoredRating,
  StoredReport,
} from '@/types/carpool';

export type DemoState = {
  profile: Profile;
  rides: Ride[];
  requests: RideRequest[];
  notifications: Notification[];
  conversations: Conversation[];
  messages: Message[];
  ratings: StoredRating[];
  reports: StoredReport[];
  blockedUserIds: string[];
};

const STORAGE_KEY = 'shareway.demo.v1';
const DEMO_USER_ID = 'demo-user';

function localDateOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function createInitialDemoState(): DemoState {
  const tomorrow = localDateOffset(1);
  const later = localDateOffset(2);
  const lastWeek = localDateOffset(-4);
  const profile: Profile = {
    id: DEMO_USER_ID,
    fullName: 'Avery Rao',
    email: 'avery@demo.shareway.app',
    bio: 'Bengaluru commuter. Happy to share the drive and the playlist.',
    homeLocation: 'Indiranagar, Bengaluru',
    preferredTransport: 'Car',
    role: 'PASSENGER',
  };

  const rides: Ride[] = [
    {
      id: 'demo-ride-own',
      driverId: DEMO_USER_ID,
      driverName: profile.fullName,
      origin: 'Indiranagar, Bengaluru',
      destination: 'Whitefield ITPL, Bengaluru',
      departureDate: tomorrow,
      departureTime: '08:40',
      estimatedArrivalTime: '09:25',
      availableSeats: 2,
      totalSeats: 3,
      price: 80,
      maxDetourKm: 4,
      status: 'SCHEDULED',
      vehicle: { make: 'Honda', model: 'City', color: 'Silver', vehicleType: 'Sedan' },
      notes: 'One quick coffee stop is okay. No smoking, please.',
      createdAt: ago(480),
    },
    {
      id: 'demo-ride-mira',
      driverId: 'demo-driver-mira',
      driverName: 'Mira Shah',
      driverAvatar: 'https://i.pravatar.cc/120?img=47',
      origin: 'Indiranagar, Bengaluru',
      destination: 'Whitefield ITPL, Bengaluru',
      departureDate: tomorrow,
      departureTime: '08:20',
      estimatedArrivalTime: '09:05',
      availableSeats: 3,
      totalSeats: 3,
      price: 75,
      maxDetourKm: 3,
      status: 'SCHEDULED',
      vehicle: { make: 'Hyundai', model: 'i20', color: 'Blue', vehicleType: 'Hatchback' },
      notes: 'Leaving on time. Small bags fit in the boot.',
      createdAt: ago(720),
    },
    {
      id: 'demo-ride-arjun',
      driverId: 'demo-driver-arjun',
      driverName: 'Arjun Rao',
      driverAvatar: 'https://i.pravatar.cc/120?img=12',
      origin: 'Koramangala, Bengaluru',
      destination: 'Manyata Tech Park, Bengaluru',
      departureDate: tomorrow,
      departureTime: '08:00',
      estimatedArrivalTime: '09:00',
      availableSeats: 2,
      totalSeats: 2,
      price: 95,
      maxDetourKm: 5,
      status: 'SCHEDULED',
      vehicle: { make: 'Tata', model: 'Nexon', color: 'White', vehicleType: 'SUV' },
      notes: 'Pickup near the Sony World signal.',
      createdAt: ago(950),
    },
    {
      id: 'demo-ride-nisha',
      driverId: 'demo-driver-nisha',
      driverName: 'Nisha Verma',
      driverAvatar: 'https://i.pravatar.cc/120?img=44',
      origin: 'HSR Layout, Bengaluru',
      destination: 'Whitefield ITPL, Bengaluru',
      departureDate: later,
      departureTime: '08:30',
      estimatedArrivalTime: '09:20',
      availableSeats: 2,
      totalSeats: 2,
      price: 65,
      maxDetourKm: 6,
      status: 'SCHEDULED',
      vehicle: { make: 'Maruti Suzuki', model: 'Brezza', color: 'Red', vehicleType: 'SUV' },
      notes: 'Flexible pickup around HSR Sector 2.',
      createdAt: ago(1440),
    },
    {
      id: 'demo-ride-completed',
      driverId: DEMO_USER_ID,
      driverName: profile.fullName,
      origin: 'Indiranagar, Bengaluru',
      destination: 'Koramangala, Bengaluru',
      departureDate: lastWeek,
      departureTime: '17:30',
      estimatedArrivalTime: '18:15',
      availableSeats: 1,
      totalSeats: 2,
      price: 50,
      maxDetourKm: 3,
      status: 'COMPLETED',
      vehicle: { make: 'Honda', model: 'City', color: 'Silver', vehicleType: 'Sedan' },
      createdAt: ago(7 * 24 * 60),
    },
  ];

  return {
    profile,
    rides,
    requests: [
      {
        id: 'demo-request-incoming',
        rideId: 'demo-ride-own',
        passengerId: 'demo-passenger-ishaan',
        passengerName: 'Ishaan Kapoor',
        seatsRequested: 1,
        status: 'PENDING',
        message: 'Hi Avery, I work near ITPL and can meet at the metro station.',
        createdAt: ago(18),
      },
      {
        id: 'demo-request-accepted',
        rideId: 'demo-ride-mira',
        passengerId: DEMO_USER_ID,
        passengerName: profile.fullName,
        seatsRequested: 1,
        status: 'ACCEPTED',
        message: 'I can be at the Indiranagar metro entrance.',
        createdAt: ago(360),
      },
      {
        id: 'demo-request-completed',
        rideId: 'demo-ride-completed',
        passengerId: 'demo-passenger-maya',
        passengerName: 'Maya Iyer',
        seatsRequested: 1,
        status: 'ACCEPTED',
        createdAt: ago(4 * 24 * 60),
      },
    ],
    notifications: [
      {
        id: 'demo-notification-incoming',
        userId: DEMO_USER_ID,
        type: 'RIDE_REQUEST_RECEIVED',
        title: 'New ride request',
        message: 'Ishaan Kapoor requested to join your ride to Whitefield.',
        read: false,
        metadata: { rideId: 'demo-ride-own', requestId: 'demo-request-incoming' },
        createdAt: ago(18),
      },
      {
        id: 'demo-notification-accepted',
        userId: DEMO_USER_ID,
        type: 'RIDE_REQUEST_ACCEPTED',
        title: 'Your seat is confirmed',
        message: 'Mira Shah accepted your request for tomorrow morning.',
        read: true,
        metadata: { rideId: 'demo-ride-mira' },
        createdAt: ago(350),
      },
    ],
    conversations: [
      {
        id: 'demo-conversation-mira',
        participantName: 'Mira Shah',
        participantAvatar: 'https://i.pravatar.cc/120?img=47',
        rideId: 'demo-ride-mira',
        lastMessage: 'Great, see you by the metro entrance at 8:15.',
        updatedAt: ago(12),
      },
    ],
    messages: [
      {
        id: 'demo-message-1',
        conversationId: 'demo-conversation-mira',
        senderId: DEMO_USER_ID,
        text: 'I can be at the Indiranagar metro entrance.',
        createdAt: ago(20),
        readAt: ago(19),
      },
      {
        id: 'demo-message-2',
        conversationId: 'demo-conversation-mira',
        senderId: 'demo-driver-mira',
        text: 'Great, see you by the metro entrance at 8:15.',
        createdAt: ago(12),
      },
    ],
    ratings: [],
    reports: [],
    blockedUserIds: [],
  };
}

export function loadDemoState(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialDemoState();
    const parsed = JSON.parse(saved) as Partial<DemoState>;
    if (
      parsed.profile &&
      Array.isArray(parsed.rides) &&
      Array.isArray(parsed.requests) &&
      Array.isArray(parsed.notifications) &&
      Array.isArray(parsed.conversations) &&
      Array.isArray(parsed.messages) &&
      Array.isArray(parsed.ratings) &&
      Array.isArray(parsed.reports) &&
      Array.isArray(parsed.blockedUserIds)
    ) {
      return parsed as DemoState;
    }
  } catch {
    // A malformed demo cache should not prevent the sample app from opening.
  }
  return createInitialDemoState();
}

export function saveDemoState(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetDemoState(): DemoState {
  const fresh = createInitialDemoState();
  saveDemoState(fresh);
  return fresh;
}
