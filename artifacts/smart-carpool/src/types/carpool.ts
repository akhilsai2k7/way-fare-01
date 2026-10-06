export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';
export type RideStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  homeLocation?: string;
  preferredTransport?: string;
  rating?: number;
  role: UserRole;
};

export type Vehicle = {
  make: string;
  model: string;
  color?: string;
  vehicleType: string;
};

export type Ride = {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverRating?: number;
  origin: string;
  destination: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  departureDate: string;
  departureTime: string;
  estimatedArrivalTime?: string;
  availableSeats: number;
  totalSeats: number;
  price: number;
  maxDetourKm: number;
  status: RideStatus;
  vehicle: Vehicle;
  notes?: string;
  createdAt: string;
};

export type RideRequest = {
  id: string;
  rideId: string;
  passengerId: string;
  passengerName: string;
  seatsRequested: number;
  status: RequestStatus;
  message?: string;
  createdAt: string;
  updatedAt?: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type Conversation = {
  id: string;
  participantName: string;
  participantAvatar?: string;
  rideId?: string;
  lastMessage?: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string;
};

export type RideSearchFilters = {
  origin?: string;
  destination?: string;
  departureDate?: string;
  departureTime?: string;
  seats?: number;
  maxPrice?: number;
  maxDetourKm?: number;
  vehicleType?: string;
};

export type CreateRideInput = {
  origin: string;
  destination: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  departureDate: string;
  departureTime: string;
  estimatedArrivalTime?: string;
  availableSeats: number;
  price: number;
  maxDetourKm: number;
  vehicle: Vehicle;
  notes?: string;
};

export type ProfileInput = Pick<
  Profile,
  'fullName' | 'phone' | 'avatarUrl' | 'bio' | 'homeLocation' | 'preferredTransport'
>;

export type RatingInput = {
  rideId: string;
  reviewedUserId: string;
  rating: number;
  review?: string;
};

export type ReportInput = {
  reportedUserId?: string;
  rideId?: string;
  reason: string;
  description?: string;
};

export type StoredRating = RatingInput & {
  id: string;
  reviewerId: string;
  createdAt: string;
};

export type StoredReport = ReportInput & {
  id: string;
  reporterId: string;
  status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
};
