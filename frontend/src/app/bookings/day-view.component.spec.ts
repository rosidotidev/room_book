import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Booking, BookingStatus, Room } from '../api';
import { DayColumn } from './bookings.facade';
import { buildColumn, freeSelection, ROWS, rowTime } from './day-model';
import { DayLayout, DayViewComponent, SlotSelection } from './day-view.component';

const AURORA: Room = { id: 1, name: 'Aurora', capacity: 4, equipment: [], active: true };
const BOREALIS: Room = { id: 2, name: 'Borealis', capacity: 6, equipment: [], active: true };

function booking(id: number, from: string, to: string, extra: Partial<Booking> = {}): Booking {
  return {
    id, roomId: 1, title: `Meeting ${id}`, organizer: 'Ana', status: BookingStatus.Confirmed,
    start: `2026-10-20T${from}:00+02:00`, end: `2026-10-20T${to}:00+02:00`,
    createdAt: '2026-10-19T08:00:00+02:00', ...extra,
  };
}

// Monday 19 Oct 11:00 office time: Tuesday 20 Oct is entirely in the future
const NOW = new Date('2026-10-19T09:00:00Z');

function render(columns: DayColumn[], opts: { date?: string; layout?: DayLayout; owner?: string; now?: Date } = {}) {
  const fixture = TestBed.createComponent(DayViewComponent);
  fixture.componentRef.setInput('columns', columns);
  fixture.componentRef.setInput('date', opts.date ?? '2026-10-20');
  fixture.componentRef.setInput('layout', opts.layout ?? 'timeline');
  fixture.componentRef.setInput('owner', opts.owner ?? '');
  fixture.componentRef.setInput('now', opts.now ?? NOW);
  const selected = vi.fn<(s: SlotSelection) => void>();
  fixture.componentInstance.slotSelected.subscribe(selected);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, selected };
}

describe('day model', () => {
  it('has 48 rows from 08:00 to 19:45', () => {
    expect(ROWS).toBe(48);
    expect(rowTime(0)).toBe('08:00');
    expect(rowTime(47)).toBe('19:45');
  });

  it('turns bookings into blocks and leaves the other rows free', () => {
    const model = buildColumn({ room: AURORA, bookings: [booking(1, '10:00', '11:30')] }, '2026-10-20', NOW, '');
    expect(model.blocks.map((b) => [b.startRow, b.endRow])).toEqual([[8, 14]]);
    expect(model.cells.length).toBe(48 - 6);
    expect(model.cells.every((c) => c.state === 'free')).toBe(true);
  });

  it('marks the rows before now as past on today and everything as past on earlier days', () => {
    const today = new Date('2026-10-20T08:07:00Z'); // 10:07 office time
    const model = buildColumn({ room: AURORA, bookings: [] }, '2026-10-20', today, '');
    expect(model.cells.find((c) => c.time === '10:00')?.state).toBe('past');
    expect(model.cells.find((c) => c.time === '10:15')?.state).toBe('free');
    const earlier = buildColumn({ room: AURORA, bookings: [] }, '2026-10-19', today, '');
    expect(earlier.cells.every((c) => c.state === 'past')).toBe(true);
  });

  it('offers a one-hour selection that stops before an occupied row and at 20:00', () => {
    const model = buildColumn({ room: AURORA, bookings: [booking(1, '10:30', '11:00')] }, '2026-10-20', NOW, '');
    expect(freeSelection(model, 8)).toEqual({ start: '10:00', end: '10:30' }); // 10:00 stops at the booking
    expect(freeSelection(model, 10)).toEqual({ start: '10:30'.replace('10:30', rowTime(10)), end: '11:30' });
    const evening = buildColumn({ room: AURORA, bookings: [] }, '2026-10-20', NOW, '');
    expect(freeSelection(evening, 46)).toEqual({ start: '19:30', end: '20:00' });
  });
});

describe('DayViewComponent', () => {
  it('renders one free button per free row and one block per booking, with title and accessible detail', () => {
    const { el } = render([{ room: AURORA, bookings: [booking(1, '10:00', '11:00')] }]);
    expect(el.querySelectorAll('button.free').length).toBe(44);
    const block = el.querySelector('button.block') as HTMLElement;
    expect(block.textContent).toContain('Meeting 1');
    expect(block.textContent).toContain('Booked');
    expect(block.getAttribute('aria-label')).toBe('Meeting 1, Ana, 10:00 to 11:00');
    expect(block.getAttribute('title')).toBe('Meeting 1, Ana, 10:00 to 11:00');
  });

  it('labels free rows and gives every state a label and an icon, not only a color', () => {
    const { el } = render([{ room: AURORA, bookings: [booking(1, '10:00', '11:00')] }]);
    const free = el.querySelector('button.free') as HTMLElement;
    expect(free.textContent).toContain('Free');
    expect(free.querySelector('svg')).toBeTruthy();
    expect(free.getAttribute('aria-label')).toBe('Free 08:00 in Aurora, select to book');
    expect(el.querySelector('button.block svg')).toBeTruthy();
  });

  it('labels the organizer\'s own bookings "Yours" ignoring case and spaces', () => {
    const { el } = render(
      [{ room: AURORA, bookings: [booking(1, '10:00', '11:00'), booking(2, '12:00', '13:00', { organizer: 'Bea' })] }],
      { owner: '  ANA ' },
    );
    const blocks = Array.from(el.querySelectorAll('button.block'));
    expect(blocks[0].textContent).toContain('Yours');
    expect(blocks[0].classList.contains('own')).toBe(true);
    expect(blocks[1].textContent).toContain('Booked');
    expect(blocks[1].classList.contains('own')).toBe(false);
  });

  it('shows the full detail when a block is tapped', () => {
    const { fixture, el } = render([{ room: AURORA, bookings: [booking(1, '10:00', '11:00', { title: 'A very long title '.repeat(5) })] }]);
    const block = el.querySelector('button.block') as HTMLButtonElement;
    expect(block.querySelector('.more')).toBeNull();
    block.click();
    fixture.detectChanges();
    expect(block.querySelector('.more')?.textContent).toContain('Ana · 10:00–11:00');
    expect(block.getAttribute('aria-expanded')).toBe('true');
  });

  it('emits the selection when a free row is chosen, stopping before an occupied row', () => {
    const { el, selected } = render([{ room: AURORA, bookings: [booking(1, '10:30', '11:00')] }]);
    (el.querySelector('button[aria-label^="Free 10:00"]') as HTMLButtonElement).click();
    expect(selected).toHaveBeenCalledWith({ roomId: 1, date: '2026-10-20', start: '10:00', end: '10:30' });
  });

  it('does not offer the periods that already passed today', () => {
    const { el } = render([{ room: AURORA, bookings: [] }], { now: new Date('2026-10-20T08:07:00Z') });
    expect(el.querySelector('button[aria-label^="Free 10:00"]')).toBeNull();
    expect(el.querySelector('button[aria-label^="Free 10:15"]')).toBeTruthy();
    expect(el.querySelector('.slot.past')?.textContent).toContain('Past');
  });

  it('shows the empty-day message', () => {
    const { el } = render([{ room: AURORA, bookings: [] }]);
    expect(el.textContent).toContain('No bookings today — be the first to book');
  });

  it('explains weekends and offers no rows', () => {
    const { el } = render([{ room: AURORA, bookings: [] }], { date: '2026-10-24' });
    expect(el.textContent).toContain('only possible Monday to Friday');
    expect(el.querySelectorAll('button.free').length).toBe(0);
  });

  it('renders one room as an agenda or a timeline and several rooms side by side as a grid', () => {
    const one = render([{ room: AURORA, bookings: [] }], { layout: 'agenda' });
    expect(one.el.classList.contains('layout-agenda')).toBe(true);
    expect(one.el.querySelectorAll('.column-head').length).toBe(1);

    const timeline = render([{ room: AURORA, bookings: [] }], { layout: 'timeline' });
    expect(timeline.el.classList.contains('layout-timeline')).toBe(true);

    const grid = render(
      [{ room: AURORA, bookings: [booking(1, '10:00', '11:00')] }, { room: BOREALIS, bookings: [] }],
      { layout: 'grid' },
    );
    expect(grid.el.classList.contains('layout-grid')).toBe(true);
    expect(Array.from(grid.el.querySelectorAll('.column-head')).map((h) => h.textContent?.trim())).toEqual(['Aurora', 'Borealis']);
    expect(grid.el.querySelectorAll('button.block').length).toBe(1);
  });

  it('moves the focus between free rows of a column with the arrow keys', () => {
    const { el } = render([{ room: AURORA, bookings: [] }]);
    const rows = Array.from(el.querySelectorAll<HTMLButtonElement>('button.free'));
    rows[0].focus();
    rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(rows[1]);
    rows[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(rows[0]);
  });
});
