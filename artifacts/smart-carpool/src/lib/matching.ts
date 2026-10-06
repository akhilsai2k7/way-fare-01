import type { Ride, RideSearchFilters } from '@/types/carpool';

export const MATCH_WEIGHTS = {
  route: 0.4,
  origin: 0.2,
  destination: 0.2,
  time: 0.15,
  seats: 0.05,
} as const;

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function labelSimilarity(first: string, second: string): number {
  const a = normalize(first);
  const b = normalize(second);
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 1;

  const aWords = new Set(a.split(' ').filter((word) => word.length > 2));
  const bWords = new Set(b.split(' ').filter((word) => word.length > 2));
  if (!aWords.size || !bWords.size) return 0;
  const overlap = [...aWords].filter((word) => bWords.has(word)).length;
  return overlap / new Set([...aWords, ...bWords]).size;
}

function endpointScore(first: string, second: string): number {
  return labelSimilarity(first, second);
}

function timeScore(preferred: string | undefined, departure: string): number {
  if (!preferred) return 1;
  const [preferredHour = 0, preferredMinute = 0] = preferred.split(':').map(Number);
  const [rideHour = 0, rideMinute = 0] = departure.split(':').map(Number);
  const difference = Math.abs(preferredHour * 60 + preferredMinute - (rideHour * 60 + rideMinute));
  const wrappedDifference = Math.min(difference, 24 * 60 - difference);
  return Math.max(0, 1 - wrappedDifference / 180);
}

export function calculateMatchScore(
  search: RideSearchFilters,
  ride: Ride,
): number {
  const origin = search.origin ? endpointScore(search.origin, ride.origin) : 1;
  const destination = search.destination
    ? endpointScore(search.destination, ride.destination)
    : 1;
  const route = (origin + destination) / 2;
  const time = timeScore(search.departureTime, ride.departureTime);
  const seats = search.seats
    ? Math.min(1, ride.availableSeats / search.seats)
    : 1;
  const score =
    route * MATCH_WEIGHTS.route +
    origin * MATCH_WEIGHTS.origin +
    destination * MATCH_WEIGHTS.destination +
    time * MATCH_WEIGHTS.time +
    seats * MATCH_WEIGHTS.seats;
  return Math.round(score * 100);
}

export function findMatchingRides(
  rides: Ride[],
  filters: RideSearchFilters,
): Ride[] {
  const origin = normalize(filters.origin ?? '');
  const destination = normalize(filters.destination ?? '');

  return rides
    .filter((ride) => ride.status === 'SCHEDULED' && ride.availableSeats > 0)
    .filter((ride) => !filters.departureDate || ride.departureDate === filters.departureDate)
    .filter((ride) => !filters.seats || ride.availableSeats >= filters.seats)
    .filter((ride) => filters.maxPrice === undefined || ride.price <= filters.maxPrice)
    .filter(
      (ride) =>
        filters.maxDetourKm === undefined || ride.maxDetourKm <= filters.maxDetourKm,
    )
    .filter(
      (ride) =>
        !filters.vehicleType ||
        normalize(ride.vehicle.vehicleType) === normalize(filters.vehicleType),
    )
    .filter((ride) => !origin || labelSimilarity(filters.origin ?? '', ride.origin) > 0)
    .filter(
      (ride) =>
        !destination || labelSimilarity(filters.destination ?? '', ride.destination) > 0,
    )
    .map((ride) => ({ ...ride, matchScore: calculateMatchScore(filters, ride) }))
    .filter((ride) => ride.matchScore >= 20)
    .sort(
      (first, second) =>
        (second.matchScore ?? 0) - (first.matchScore ?? 0) ||
        first.price - second.price,
    );
}
