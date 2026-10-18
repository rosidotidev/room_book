import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Room, RoomActivationResult, RoomInput, RoomsService } from '../api';
import { problemMessage } from '../shared/problem-message';

export interface RoomFilter {
  minCapacity: number | null;
  equipment: string | null;
}

export type FieldName = 'name' | 'capacity' | 'equipment' | 'form';

/** A readable error and the form field it belongs next to. */
export interface FieldError {
  field: FieldName;
  message: string;
}

/** Maps a failed call to the field it concerns: a duplicate name to the name, a named field to that field, the rest to the form. */
export function toFieldError(error: unknown): FieldError {
  const message = problemMessage(error);
  if (error instanceof HttpErrorResponse) {
    if (error.status === 409) {
      return { field: 'name', message };
    }
    if (error.status === 400) {
      const lower = message.toLowerCase();
      for (const field of ['name', 'capacity', 'equipment'] as const) {
        if (lower.startsWith(field)) {
          return { field, message };
        }
      }
    }
  }
  return { field: 'form', message };
}

/** Single entry point of the rooms screens to the generated API client. */
@Injectable({ providedIn: 'root' })
export class RoomsFacade {
  private readonly api = inject(RoomsService);

  list(filter?: Partial<RoomFilter>): Observable<Room[]> {
    return this.api.listRooms(filter?.minCapacity ?? undefined, filter?.equipment ?? undefined);
  }

  create(input: RoomInput): Observable<Room> {
    return this.api.createRoom(input);
  }

  update(id: number, input: RoomInput): Observable<Room> {
    return this.api.updateRoom(id, input);
  }

  setActive(id: number, active: boolean): Observable<RoomActivationResult> {
    return this.api.setRoomActive(id, { active });
  }
}
