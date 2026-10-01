/** The seats are all taken. A zero capacity is never "full". */
export function isFull(seatsTaken: number | null, capacity: number | null): boolean {
  return seatsTaken !== null && capacity !== null && capacity > 0 && seatsTaken >= capacity;
}

/** Started and not yet ended (an open-ended occurrence is never "in progress"). */
export function isInProgress(startsAt: string | null, endsAt: string | null, now = Date.now()): boolean {
  if (startsAt === null || endsAt === null) return false;
  return Date.parse(startsAt) <= now && Date.parse(endsAt) > now;
}
