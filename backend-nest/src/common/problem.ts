/** RFC 9457 problem details as returned by every error response (constitution VI). */
export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

/** A business-rule failure with the status and title documented in contracts/README.md. */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = 'DomainError';
  }

  toProblem(instance?: string): ProblemBody {
    return { type: 'about:blank', title: this.title, status: this.status, detail: this.detail, instance };
  }
}

// Messages are copied from backend/src/main/java/com/roombook/** (RoomService, BookingService,
// BookingRules, the exception classes and ApiExceptionHandler). Do not reword them here.

/** 400 "Invalid room": room input (name, capacity, equipment, minCapacity, active). */
export function invalidRoom(detail: string): DomainError {
  return new DomainError(400, 'Invalid room', detail);
}

/** 400 "Booking not allowed": a required booking field is missing or a time rule is violated. */
export function bookingNotAllowed(detail: string): DomainError {
  return new DomainError(400, 'Booking not allowed', detail);
}

/** 404 "Room not found". */
export function roomNotFound(id: number): DomainError {
  return new DomainError(404, 'Room not found', `Room ${id} does not exist.`);
}

/** 404 "Booking not found". */
export function bookingNotFound(id: number): DomainError {
  return new DomainError(404, 'Booking not found', `Booking ${id} does not exist.`);
}

/** 409 "Room name already exists". */
export function duplicateRoomName(name: string): DomainError {
  return new DomainError(409, 'Room name already exists', `A room named '${name}' already exists.`);
}

/** 409 "Slot already booked"; the detail names the existing booking's time and day. */
export function slotAlreadyBooked(detail: string): DomainError {
  return new DomainError(409, 'Slot already booked', detail);
}

/** 409 "Too late to cancel". */
export function tooLateToCancel(): DomainError {
  return new DomainError(409, 'Too late to cancel', 'A booking can only be cancelled until one hour before it starts.');
}

/** 422 "Room not available": the room exists but is deactivated. */
export function roomNotAvailable(roomName: string): DomainError {
  return new DomainError(422, 'Room not available', `The room '${roomName}' is deactivated and cannot be booked.`);
}
