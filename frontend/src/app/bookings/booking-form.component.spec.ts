import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Booking, BookingStatus, Room } from '../api';
import { NOW } from '../shared/clock';
import { OrganizerStore } from '../shared/organizer-store';
import { BookingFormComponent, BookingFormInitial } from './booking-form.component';
import { BookingsFacade } from './bookings.facade';

const ROOMS: Room[] = [{ id: 1, name: 'Aurora', capacity: 4, equipment: [], active: true }];
const SAVED: Booking = {
  id: 9, roomId: 1, title: 'Planning', organizer: 'Ana', status: BookingStatus.Confirmed,
  start: '2026-10-20T10:00:00+02:00', end: '2026-10-20T11:00:00+02:00', createdAt: '2026-10-19T09:00:00+02:00',
};
const FIXED_NOW = new Date('2026-10-19T09:00:00Z'); // Monday 11:00 office time

function setup(create: unknown, initial: BookingFormInitial = { roomId: 1, date: '2026-10-20', start: '10:00', end: '11:00' }) {
  const store = { read: vi.fn(() => ''), write: vi.fn(), clear: vi.fn() };
  TestBed.configureTestingModule({
    imports: [BookingFormComponent],
    providers: [
      { provide: BookingsFacade, useValue: { create } },
      { provide: OrganizerStore, useValue: store },
      { provide: NOW, useValue: () => FIXED_NOW },
    ],
  });
  const fixture = TestBed.createComponent(BookingFormComponent);
  fixture.componentRef.setInput('rooms', ROOMS);
  fixture.componentRef.setInput('initial', initial);
  const saved = vi.fn();
  fixture.componentInstance.saved.subscribe(saved);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const form = fixture.componentInstance.form;
  const submit = () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  return { fixture, el, form, submit, saved, store };
}

describe('BookingFormComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('opens pre-filled from a selection', () => {
    const { form } = setup(vi.fn());
    expect(form.getRawValue()).toMatchObject({ roomId: 1, date: '2026-10-20', start: '10:00', end: '11:00' });
  });

  it('pre-fills the organizer from the remembered name', () => {
    TestBed.resetTestingModule();
    const store = { read: vi.fn(() => 'Ana'), write: vi.fn(), clear: vi.fn() };
    TestBed.configureTestingModule({
      imports: [BookingFormComponent],
      providers: [{ provide: BookingsFacade, useValue: { create: vi.fn() } }, { provide: OrganizerStore, useValue: store }],
    });
    const fixture = TestBed.createComponent(BookingFormComponent);
    fixture.componentRef.setInput('rooms', ROOMS);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.organizer.value).toBe('Ana');
  });

  it('blocks an empty submission and explains what to fix next to the fields', () => {
    const create = vi.fn();
    const { el, submit } = setup(create, {});
    submit();
    expect(create).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Choose a room.');
    expect(el.textContent).toContain('Enter a title for the booking.');
    expect(el.textContent).toContain('Enter your name.');
  });

  it('pre-checks the obvious time errors before sending', () => {
    const create = vi.fn();
    const { form, el, submit } = setup(create);
    form.patchValue({ title: 'Planning', organizer: 'Ana' });

    form.patchValue({ start: '11:00', end: '10:00' });
    submit();
    expect(el.textContent).toContain('The end must be after the start.');

    form.patchValue({ start: '08:00', end: '13:00' });
    submit();
    expect(el.textContent).toContain('at most 4 hours');

    form.patchValue({ date: '2026-10-19', start: '09:00', end: '10:00' }); // Monday, before 11:00 now
    submit();
    expect(el.textContent).toContain('already passed');

    form.patchValue({ date: '2026-10-24', start: '10:00', end: '11:00' }); // Saturday
    submit();
    expect(el.textContent).toContain('Monday to Friday');
    expect(create).not.toHaveBeenCalled();
  });

  it('limits title and organizer to 100 characters', () => {
    const create = vi.fn();
    const { form, submit } = setup(create);
    form.patchValue({ title: 't'.repeat(101), organizer: 'Ana' });
    submit();
    expect(form.controls.title.hasError('maxlength')).toBe(true);
    form.patchValue({ title: 'ok', organizer: 'o'.repeat(101) });
    submit();
    expect(form.controls.organizer.hasError('maxlength')).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it('sends office-offset times, remembers the organizer and reports the booking', () => {
    const create = vi.fn(() => of(SAVED));
    const { form, submit, saved, store } = setup(create);
    form.patchValue({ title: '  Planning ', organizer: ' Ana ' });
    submit();
    expect(create).toHaveBeenCalledWith({
      roomId: 1, title: 'Planning', organizer: 'Ana',
      start: '2026-10-20T10:00:00+02:00', end: '2026-10-20T11:00:00+02:00',
    });
    expect(store.write).toHaveBeenCalledWith('Ana');
    expect(saved).toHaveBeenCalledWith(SAVED);
  });

  it('shows a plain-language refusal above the actions and keeps every entered value', () => {
    const detail = 'The room is already booked from 10:00 to 11:30 on Tue 20 Oct.';
    const create = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Slot already booked', detail } })));
    const { form, el, submit, saved, store } = setup(create);
    form.patchValue({ title: 'Planning', organizer: 'Ana' });
    submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(detail);
    expect(form.getRawValue()).toMatchObject({ roomId: 1, date: '2026-10-20', start: '10:00', end: '11:00', title: 'Planning', organizer: 'Ana' });
    expect(saved).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
  });

  it('keeps the values and explains when the system is unreachable', () => {
    const create = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    const { form, el, submit } = setup(create);
    form.patchValue({ title: 'Planning', organizer: 'Ana' });
    submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('not reachable');
    expect(form.controls.title.value).toBe('Planning');
  });
});
