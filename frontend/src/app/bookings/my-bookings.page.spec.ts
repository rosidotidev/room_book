import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Booking, BookingStatus } from '../api';
import { NOW } from '../shared/clock';
import { OrganizerStore } from '../shared/organizer-store';
import { BookingsFacade } from './bookings.facade';
import { MyBookingsPage } from './my-bookings.page';

// Tuesday 20 Oct 2026, 10:00 office time
const FIXED_NOW = new Date('2026-10-20T08:00:00Z');

function booking(id: number, start: string, end: string, status: BookingStatus = BookingStatus.Confirmed): Booking {
  return {
    id, roomId: 1, title: `Meeting ${id}`, organizer: 'Ana', status,
    start: `2026-10-20T${start}:00+02:00`, end: `2026-10-20T${end}:00+02:00`, createdAt: '2026-10-19T09:00:00+02:00',
  };
}

function setup(opts: { list: Booking[]; name?: string; desktop?: boolean; cancel?: unknown }) {
  const facade = {
    allRooms: vi.fn(() => of([{ id: 1, name: 'Aurora', capacity: 4, equipment: [], active: true }])),
    byOrganizer: vi.fn(() => of(opts.list)),
    cancel: vi.fn(opts.cancel as never),
  };
  const store = { read: vi.fn(() => opts.name ?? 'Ana'), write: vi.fn(), clear: vi.fn() };
  TestBed.configureTestingModule({
    imports: [MyBookingsPage],
    providers: [
      { provide: BookingsFacade, useValue: facade },
      { provide: OrganizerStore, useValue: store },
      { provide: NOW, useValue: () => FIXED_NOW },
      { provide: BreakpointObserver, useValue: { isMatched: () => false, observe: () => of({ matches: !!opts.desktop, breakpoints: { '(min-width: 1024.02px)': !!opts.desktop } }) } },
    ],
  });
  const fixture = TestBed.createComponent(MyBookingsPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const cancelButtons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button.act'));
  return { facade, store, fixture, el, cancelButtons };
}

describe('MyBookingsPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('looks up the remembered name and lists room, date, time, title and status', () => {
    const { facade, el } = setup({ list: [booking(1, '14:00', '15:00')] });
    expect(facade.byOrganizer).toHaveBeenCalledWith('Ana');
    expect(el.textContent).toContain('Meeting 1');
    expect(el.textContent).toContain('Aurora');
    expect(el.textContent).toContain('14:00–15:00');
    expect(el.textContent).toContain('Confirmed');
  });

  it('enables Cancel when at least 60 minutes remain and disables it inside the window with a reason', () => {
    const { cancelButtons, el } = setup({
      list: [booking(1, '11:01', '12:00'), booking(2, '11:00', '12:00'), booking(3, '10:59', '12:00'), booking(4, '09:00', '10:30')],
    });
    const [far, exactly, soon, started] = cancelButtons();
    expect(far.disabled).toBe(false);
    expect(exactly.disabled).toBe(false); // exactly 60 minutes
    expect(soon.disabled).toBe(true); // 59 minutes
    expect(started.disabled).toBe(true);
    expect(el.querySelector('#why-3')?.textContent).toContain('Starts in less than an hour');
    expect(el.querySelector('#why-4')?.textContent).toContain('Already started');
    expect(soon.getAttribute('aria-describedby')).toBe('why-3');
  });

  it('keeps a cancelled booking in the list, marked with a label and an icon, without a Cancel button', () => {
    const cancelled = booking(1, '14:00', '15:00', BookingStatus.Cancelled);
    const { el, cancelButtons } = setup({ list: [cancelled] });
    expect(el.textContent).toContain('Cancelled');
    expect(el.querySelector('.status.cancelled svg')).toBeTruthy();
    expect(cancelButtons().length).toBe(0);
  });

  it('cancels a booking and shows it as cancelled in the same list', () => {
    const cancel = vi.fn(() => of(booking(1, '14:00', '15:00', BookingStatus.Cancelled)));
    const { fixture, el, cancelButtons } = setup({ list: [booking(1, '14:00', '15:00')], cancel });
    cancelButtons()[0].click();
    fixture.detectChanges();
    expect(cancel).toHaveBeenCalledWith(1);
    expect(el.textContent).toContain('Cancelled');
    expect(el.querySelectorAll('.card').length).toBe(1);
  });

  it('shows a plain message and leaves the list unchanged when the cancellation is refused', () => {
    const detail = 'A booking can only be cancelled until one hour before it starts.';
    const cancel = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Too late to cancel', detail } })));
    const { fixture, el, cancelButtons } = setup({ list: [booking(1, '14:00', '15:00')], cancel });
    cancelButtons()[0].click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(detail);
    expect(el.textContent).toContain('Confirmed');
  });

  it('shows friendly messages for no name and for a name without bookings', () => {
    const noName = setup({ list: [], name: '' });
    expect(noName.el.textContent).toContain('Enter the name you booked under');
    expect(noName.facade.byOrganizer).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const empty = setup({ list: [] });
    expect(empty.el.textContent).toContain('No bookings found');
  });

  it('remembers the name when it is searched', () => {
    const { store } = setup({ list: [] });
    expect(store.write).toHaveBeenCalledWith('Ana');
  });

  it('shows a table with a status column on desktop and cards elsewhere', () => {
    const desktop = setup({ list: [booking(1, '14:00', '15:00')], desktop: true });
    expect(desktop.el.querySelector('table')).toBeTruthy();
    expect(Array.from(desktop.el.querySelectorAll('th')).map((h) => h.textContent?.trim())).toContain('Status');
    expect(desktop.el.querySelector('.cards')).toBeNull();

    TestBed.resetTestingModule();
    const cards = setup({ list: [booking(1, '14:00', '15:00')], desktop: false });
    expect(cards.el.querySelector('.cards')).toBeTruthy();
    expect(cards.el.querySelector('table')).toBeNull();
  });
});
