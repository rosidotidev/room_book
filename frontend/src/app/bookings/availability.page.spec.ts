import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Booking, BookingStatus, Room } from '../api';
import { NOW } from '../shared/clock';
import { OrganizerStore } from '../shared/organizer-store';
import { DESKTOP_QUERY, PHONE_QUERY } from '../shared/responsive-dialog';
import { AvailabilityPage } from './availability.page';
import { BookingsFacade } from './bookings.facade';
import { DayViewComponent } from './day-view.component';

const ROOMS: Room[] = [
  { id: 2, name: 'Borealis', capacity: 6, equipment: [], active: true },
  { id: 1, name: 'Aurora', capacity: 4, equipment: [], active: true },
];
const SAVED: Booking = {
  id: 7, roomId: 2, title: 'Planning', organizer: 'Ana', status: BookingStatus.Confirmed,
  start: '2026-10-21T10:00:00+02:00', end: '2026-10-21T11:00:00+02:00', createdAt: '2026-10-19T09:00:00+02:00',
};

function breakpointState(phone: boolean, desktop: boolean) {
  return { matches: phone || desktop, breakpoints: { [PHONE_QUERY]: phone, [DESKTOP_QUERY]: desktop } };
}

interface Options {
  today: string;
  phone?: boolean;
  desktop?: boolean;
  rooms?: Room[];
  days?: (rooms: Room[], date: string) => unknown;
  closed?: Booking | undefined;
}

function setup(opts: Options) {
  const sorted = [...(opts.rooms ?? ROOMS)].sort((a, b) => a.name.localeCompare(b.name));
  const defaultDays = (rooms: Room[]) => of(rooms.map((room) => ({ room, bookings: [] })));
  const facade = {
    activeRooms: vi.fn(() => of(sorted)),
    days: vi.fn<(rooms: Room[], date: string) => unknown>(opts.days ?? defaultDays),
  };
  const state = new BehaviorSubject(breakpointState(!!opts.phone, !!opts.desktop));
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(opts.closed) })) };
  TestBed.configureTestingModule({
    imports: [AvailabilityPage],
    providers: [
      provideRouter([]),
      { provide: BookingsFacade, useValue: facade },
      { provide: MatDialog, useValue: dialog },
      { provide: NOW, useValue: () => new Date(opts.today) },
      { provide: OrganizerStore, useValue: { read: () => '', write: vi.fn(), clear: vi.fn() } },
      { provide: BreakpointObserver, useValue: { isMatched: () => false, observe: () => state } },
    ],
  });
  const fixture = TestBed.createComponent(AvailabilityPage);
  fixture.detectChanges();
  const dayView = () =>
    fixture.debugElement.query((d) => d.componentInstance instanceof DayViewComponent)?.componentInstance as DayViewComponent;
  const call = (n: number) => facade.days.mock.calls[n];
  const bookButton = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Book a room')) as HTMLButtonElement;
  return { facade, dialog, state, fixture, el: fixture.nativeElement as HTMLElement, dayView, call, bookButton };
}

describe('AvailabilityPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('opens on the first active room by name and on today', () => {
    const { call } = setup({ today: '2026-10-20T08:00:00Z' }); // Tuesday
    expect(call(0)[0].map((r) => r.name)).toEqual(['Aurora']);
    expect(call(0)[1]).toBe('2026-10-20');
  });

  it('opens on the next Monday when today is not a working day', () => {
    const { call } = setup({ today: '2026-10-18T10:00:00Z' }); // Sunday
    expect(call(0)[1]).toBe('2026-10-19');
  });

  it('chooses the layout from the breakpoints: agenda, timeline, grid', () => {
    const phone = setup({ today: '2026-10-20T08:00:00Z', phone: true });
    expect(phone.el.querySelector('app-day-view')?.className).toContain('layout-agenda');
    expect(phone.el.querySelector('app-date-strip')).toBeTruthy();

    TestBed.resetTestingModule();
    const tablet = setup({ today: '2026-10-20T08:00:00Z' });
    expect(tablet.el.querySelector('app-day-view')?.className).toContain('layout-timeline');
    expect(tablet.el.querySelector('input[type="date"]')).toBeTruthy();

    TestBed.resetTestingModule();
    const desktop = setup({ today: '2026-10-20T08:00:00Z', desktop: true });
    expect(desktop.el.querySelector('app-day-view')?.className).toContain('layout-grid');
    expect(desktop.call(0)[0].map((r) => r.name)).toEqual(['Aurora', 'Borealis']);
  });

  it('reloads the day with every room when the layout becomes a grid', () => {
    const { facade, state, fixture, call } = setup({ today: '2026-10-20T08:00:00Z' });
    expect(facade.days).toHaveBeenCalledTimes(1);
    state.next(breakpointState(false, true));
    fixture.detectChanges();
    expect(facade.days).toHaveBeenCalledTimes(2);
    expect(call(1)[0].length).toBe(2);
  });

  it('opens the booking form with the selected period when a free row is chosen', () => {
    const { dialog, dayView } = setup({ today: '2026-10-20T08:00:00Z' });
    dayView().slotSelected.emit({ roomId: 1, date: '2026-10-20', start: '10:00', end: '11:00' });
    expect(dialog.open).toHaveBeenCalledTimes(1);
    const config = (dialog.open.mock.calls[0] as unknown as [unknown, { data: { initial: unknown } }])[1];
    expect(config.data.initial).toMatchObject({ roomId: 1, date: '2026-10-20', start: '10:00', end: '11:00' });
  });

  it('reloads the day, on the day of the new booking, without a manual refresh after a save', () => {
    const { facade, fixture, bookButton, call } = setup({ today: '2026-10-20T08:00:00Z', closed: SAVED });
    const before = facade.days.mock.calls.length;
    bookButton().click();
    fixture.detectChanges();
    expect(facade.days.mock.calls.length).toBe(before + 1);
    expect(call(before)[1]).toBe('2026-10-21');
  });

  it('does not reload when the form is closed without saving', () => {
    const { facade, bookButton } = setup({ today: '2026-10-20T08:00:00Z', closed: undefined });
    const before = facade.days.mock.calls.length;
    bookButton().click();
    expect(facade.days.mock.calls.length).toBe(before);
  });

  it('says there is nothing to book when no room is active', () => {
    const { el, bookButton } = setup({ today: '2026-10-20T08:00:00Z', rooms: [] });
    expect(el.textContent).toContain('No rooms to book yet');
    expect(bookButton().disabled).toBe(true);
  });

  it('shows a readable error with Retry when the day cannot be loaded', () => {
    let fail = true;
    const days = (rooms: Room[]) =>
      fail ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(rooms.map((room) => ({ room, bookings: [] })));
    const { el, fixture } = setup({ today: '2026-10-20T08:00:00Z', days });
    expect(el.textContent).toContain('not reachable');
    fail = false;
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Retry')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('not reachable');
  });
});
