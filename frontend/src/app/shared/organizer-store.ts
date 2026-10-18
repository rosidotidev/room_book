import { Injectable } from '@angular/core';

const KEY = 'roombook.organizer';

/** Remembers the organizer name on this device only. Storage may be unavailable, so every access is guarded. */
@Injectable({ providedIn: 'root' })
export class OrganizerStore {
  read(): string {
    try {
      return localStorage.getItem(KEY) ?? '';
    } catch {
      return '';
    }
  }

  write(name: string): void {
    try {
      localStorage.setItem(KEY, name.trim());
    } catch {
      // the name is simply not remembered
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to clear
    }
  }
}

/** Organizer names are compared ignoring letter case and surrounding spaces, as the system does. */
export function sameOrganizer(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase() && a.trim() !== '';
}
