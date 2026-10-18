import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../api';
import { RoomFiltersComponent } from './room-filters.component';
import { RoomListPage } from './room-list.page';
import { RoomFilter, RoomsFacade } from './rooms.facade';

const ROOMS: Room[] = [
  { id: 1, name: 'Aurora', capacity: 4, equipment: ['Whiteboard'], active: true },
  { id: 2, name: 'Delta', capacity: 12, equipment: ['Projector', 'Whiteboard'], active: false },
];

function setup(list: (filter?: Partial<RoomFilter>) => unknown) {
  const facade = { list: vi.fn(list) };
  TestBed.configureTestingModule({
    imports: [RoomListPage],
    providers: [provideRouter([]), { provide: RoomsFacade, useValue: facade }],
  });
  const fixture = TestBed.createComponent(RoomListPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const filters = () =>
    fixture.debugElement.query(By.directive(RoomFiltersComponent))?.componentInstance as RoomFiltersComponent;
  return { facade, fixture, el, filters };
}

describe('RoomListPage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows name, capacity and equipment of every room', () => {
    const { el } = setup(() => of(ROOMS));
    expect(el.textContent).toContain('Aurora');
    expect(el.textContent).toContain('Seats 4');
    expect(el.textContent).toContain('Projector');
    expect(el.querySelectorAll('app-room-card').length).toBe(2);
  });

  it('marks inactive rooms with a text label, not only a color', () => {
    const { el } = setup(() => of(ROOMS));
    const cards = Array.from(el.querySelectorAll('app-room-card'));
    expect(cards[0].textContent).not.toContain('Inactive');
    expect(cards[1].textContent).toContain('Inactive');
    expect(cards[1].querySelector('.inactive')).toBeTruthy();
  });

  it('filters about 300 ms after the last change, with a single call', () => {
    const { facade, filters, fixture } = setup((f) =>
      of(f?.minCapacity ? ROOMS.filter((r) => r.capacity >= f.minCapacity!) : ROOMS),
    );
    expect(facade.list).toHaveBeenCalledTimes(1);

    filters().form.controls.minCapacity.setValue(5);
    filters().form.controls.minCapacity.setValue(10);
    vi.advanceTimersByTime(299);
    expect(facade.list).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(facade.list).toHaveBeenCalledTimes(2);
    expect(facade.list).toHaveBeenLastCalledWith({ minCapacity: 10, equipment: null });

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-room-card').length).toBe(1);
  });

  it('sends the equipment filter and offers the equipment of the whole catalog', () => {
    const { facade, filters } = setup(() => of(ROOMS));
    expect(filters().equipmentOptions()).toEqual(['Projector', 'Whiteboard']);
    filters().form.controls.equipment.setValue('Projector');
    vi.advanceTimersByTime(300);
    expect(facade.list).toHaveBeenLastCalledWith({ minCapacity: null, equipment: 'Projector' });
  });

  it('flags an invalid capacity and does not call the system', () => {
    const { facade, filters } = setup(() => of(ROOMS));
    filters().form.controls.minCapacity.setValue(0);
    vi.advanceTimersByTime(300);
    expect(filters().form.controls.minCapacity.invalid).toBe(true);
    expect(facade.list).toHaveBeenCalledTimes(1);
  });

  it('shows "No rooms match" with a way to clear the filters', () => {
    const { facade, filters, fixture, el } = setup((f) => of(f?.minCapacity ? [] : ROOMS));
    filters().form.controls.minCapacity.setValue(500);
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(el.textContent).toContain('No rooms match');

    const clear = el.querySelector('.empty button') as HTMLButtonElement;
    expect(clear.textContent).toContain('Clear filters');
    clear.click();
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(el.querySelectorAll('app-room-card').length).toBe(2);
    expect(facade.list).toHaveBeenCalled();
  });

  it('shows "No rooms yet" with an Add room action when the catalog is empty', () => {
    const { el } = setup(() => of([]));
    expect(el.textContent).toContain('No rooms yet');
    const add = Array.from(el.querySelectorAll('a')).find((a) => a.textContent?.includes('Add room'));
    expect(add?.getAttribute('href')).toBe('/rooms/admin');
  });

  it('shows a readable error with Retry when the system is unreachable', () => {
    let fail = true;
    const { facade, fixture, el } = setup(() => (fail ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(ROOMS)));
    expect(el.textContent).toContain('not reachable');

    fail = false;
    const retry = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Retry'));
    retry!.click();
    fixture.detectChanges();
    expect(facade.list).toHaveBeenCalledTimes(2);
    expect(el.querySelectorAll('app-room-card').length).toBe(2);
  });
});
