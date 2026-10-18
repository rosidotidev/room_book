import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { Booking, BookingInput, BookingsService, Room } from '../api';
import { RoomsFacade } from '../rooms/rooms.facade';

/** A room and its confirmed bookings for one day. */
export interface DayColumn {
  room: Room;
  bookings: Booking[];
}

/** Single entry point of the booking screens to the generated API client. */
@Injectable({ providedIn: 'root' })
export class BookingsFacade {
  private readonly api = inject(BookingsService);
  private readonly rooms = inject(RoomsFacade);

  /** Rooms that can be booked, sorted by name. */
  activeRooms(): Observable<Room[]> {
    return this.rooms
      .list()
      .pipe(map((all) => all.filter((r) => r.active).sort((a, b) => a.name.localeCompare(b.name))));
  }

  allRooms(): Observable<Room[]> {
    return this.rooms.list();
  }

  /** Confirmed bookings of the given rooms for an office-local day, one column per room. */
  days(rooms: Room[], date: string): Observable<DayColumn[]> {
    if (rooms.length === 0) {
      return of([]);
    }
    return forkJoin(
      rooms.map((room) => this.api.getRoomAvailability(room.id, date).pipe(map((bookings) => ({ room, bookings })))),
    );
  }

  create(input: BookingInput): Observable<Booking> {
    return this.api.createBooking(input);
  }

  cancel(id: number): Observable<Booking> {
    return this.api.cancelBooking(id);
  }

  byOrganizer(name: string): Observable<Booking[]> {
    return this.api.listBookingsByOrganizer(name);
  }
}
