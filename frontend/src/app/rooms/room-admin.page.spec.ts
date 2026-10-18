import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Room, RoomActivationResult } from '../api';
import { RoomAdminPage } from './room-admin.page';
import { RoomsFacade } from './rooms.facade';

const ACTIVE: Room = { id: 1, name: 'Aurora', capacity: 4, equipment: [], active: true };
const INACTIVE: Room = { id: 2, name: 'Delta', capacity: 12, equipment: [], active: false };

function setup(confirm: boolean, result?: Partial<RoomActivationResult>) {
  const facade = {
    list: vi.fn(() => of([ACTIVE, INACTIVE])),
    setActive: vi.fn((id: number, active: boolean) =>
      of({ room: { ...ACTIVE, id, active }, futureBookings: [], ...result } as RoomActivationResult),
    ),
  };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(confirm) })) };
  TestBed.configureTestingModule({
    imports: [RoomAdminPage],
    providers: [
      { provide: RoomsFacade, useValue: facade },
      { provide: MatDialog, useValue: dialog },
      { provide: BreakpointObserver, useValue: { isMatched: () => false, observe: () => of({ matches: false, breakpoints: {} }) } },
    ],
  });
  const fixture = TestBed.createComponent(RoomAdminPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
  return { facade, dialog, fixture, el, button };
}

describe('RoomAdminPage activation', () => {
  it('asks for confirmation before deactivating and does nothing when cancelled', () => {
    const { facade, dialog, button } = setup(false);
    button('Deactivate').click();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(facade.setActive).not.toHaveBeenCalled();
  });

  it('deactivates after confirmation and refreshes the list', () => {
    const { facade, button } = setup(true);
    button('Deactivate').click();
    expect(facade.setActive).toHaveBeenCalledWith(1, false);
    expect(facade.list).toHaveBeenCalledTimes(2);
  });

  it('lists the future bookings returned by the system as a warning', () => {
    const { fixture, el, button } = setup(true, {
      futureBookings: [{ id: 9, title: 'Planning', organizer: 'Ana', start: '2026-11-02T09:00:00Z', end: '2026-11-02T10:00:00Z' }],
    });
    button('Deactivate').click();
    fixture.detectChanges();
    const warning = el.querySelector('.warning');
    expect(warning?.getAttribute('role')).toBe('alert');
    expect(warning?.textContent).toContain('1 future');
    expect(warning?.textContent).toContain('Planning');
  });

  it('shows no warning when there are no future bookings', () => {
    const { fixture, el, button } = setup(true);
    button('Deactivate').click();
    fixture.detectChanges();
    expect(el.querySelector('.warning')).toBeNull();
  });

  it('activates a room without asking for confirmation', () => {
    const { facade, dialog, button } = setup(true);
    button('Activate').click();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(facade.setActive).toHaveBeenCalledWith(2, true);
  });
});
