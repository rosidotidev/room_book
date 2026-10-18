import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { isWorkingDay } from '../shared/office-time';
import { IconComponent } from '../shared/icon.component';
import { DayColumn } from './bookings.facade';
import { Block, ColumnModel, ROWS, buildColumn, freeSelection, rowTime } from './day-model';

export type DayLayout = 'agenda' | 'timeline' | 'grid';

export interface SlotSelection {
  roomId: number;
  date: string;
  start: string;
  end: string;
}

/**
 * The day, from 08:00 to 20:00 in 15-minute rows. One component for three layouts:
 * agenda (phone) and timeline (tablet) show one room, grid (desktop) shows several side by side.
 * Every state (free, booked, own, past) carries a text label and an icon, never color alone.
 */
@Component({
  selector: 'app-day-view',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "'layout-' + layout()", '(keydown)': 'onKeydown($event)' },
  template: `
    @if (!working()) {
      <p class="notice" role="status"><app-icon name="info" /> Bookings are only possible Monday to Friday.</p>
    } @else if (empty()) {
      <p class="notice" role="status"><app-icon name="calendar" /> No bookings today — be the first to book.</p>
    }

    <div class="day" [style.--cols]="models().length" role="group" [attr.aria-label]="'Day view for ' + date()">
      <div class="corner"></div>
      @for (model of models(); track model.room.id; let c = $index) {
        <h3 class="column-head" [style.grid-column]="c + 2">{{ model.room.name }}</h3>
      }

      @for (label of hours; track label.row) {
        <span class="hour" [style.grid-row]="label.row + 2">{{ label.text }}</span>
      }

      @for (model of models(); track model.room.id; let c = $index) {
        @for (cell of model.cells; track cell.row) {
          @if (cell.state === 'free') {
            <button type="button" class="slot free" data-free
                    [attr.data-col]="c" [style.grid-column]="c + 2" [style.grid-row]="cell.row + 2"
                    [attr.aria-label]="'Free ' + cell.time + ' in ' + model.room.name + ', select to book'"
                    (click)="select(model, cell.row)">
              <app-icon name="add" /><span class="label">Free</span><span class="time">{{ cell.time }}</span>
            </button>
          } @else {
            <div class="slot past" [style.grid-column]="c + 2" [style.grid-row]="cell.row + 2"
                 [attr.aria-label]="cell.time + ' has passed'">
              <app-icon name="clock" /><span class="label">Past</span>
            </div>
          }
        }
        @for (block of model.blocks; track block.booking.id) {
          <button type="button" class="block" [class.own]="block.own" [class.expanded]="expanded() === block.booking.id"
                  [style.grid-column]="c + 2" [style.grid-row]="(block.startRow + 2) + ' / ' + (block.endRow + 2)"
                  [style.min-height]="'calc(var(--slot-height) * ' + (block.endRow - block.startRow) + ')'"
                  [attr.title]="detail(block)" [attr.aria-label]="detail(block)"
                  [attr.aria-expanded]="expanded() === block.booking.id"
                  (click)="toggle(block)">
            <span class="state">
              <app-icon [name]="block.own ? 'person' : 'lock'" />
              <span class="label">{{ block.own ? 'Yours' : 'Booked' }}</span>
            </span>
            <span class="title">{{ block.booking.title }}</span>
            @if (expanded() === block.booking.id) {
              <span class="more">{{ block.booking.organizer }} · {{ block.start }}–{{ block.end }}</span>
            }
          </button>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .notice {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin: 0 0 var(--space-2);
      padding: var(--space-2);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-ink-muted);
      box-shadow: var(--elevation-1);
    }
    .day {
      display: grid;
      grid-template-columns: 3.5rem repeat(var(--cols, 1), minmax(0, 1fr));
      grid-template-rows: auto repeat(48, var(--slot-height));
      column-gap: var(--space-1);
      padding: var(--space-1);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--elevation-1);
      animation: fade-in var(--motion-fast) ease-out;
    }
    :host(.layout-grid) .day {
      grid-template-columns: 3.5rem repeat(var(--cols, 1), minmax(8rem, 1fr));
      overflow-x: auto;
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .column-head {
      grid-row: 1;
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-body);
      text-align: center;
      overflow-wrap: anywhere;
    }
    .hour {
      grid-column: 1;
      align-self: start;
      padding-top: 0.125rem;
      color: var(--color-ink-muted);
      font-size: var(--font-size-caption);
      font-variant-numeric: tabular-nums;
    }
    .slot {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      min-height: var(--slot-height);
      margin: 0;
      padding: 0 var(--space-1);
      border: 0;
      border-top: 1px dashed var(--color-divider);
      font: inherit;
      font-size: var(--font-size-caption);
      text-align: left;
    }
    .slot.free {
      background: var(--slot-free-bg);
      color: var(--slot-free-ink);
      cursor: pointer;
    }
    .slot.free:hover {
      background: var(--color-accent-soft);
    }
    .slot .time {
      margin-left: auto;
      font-variant-numeric: tabular-nums;
    }
    .slot.past {
      background: var(--slot-past-bg);
      color: var(--slot-past-ink);
    }
    .block {
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      height: 100%;
      margin: 0;
      padding: 0.25rem var(--space-1);
      overflow: hidden;
      border: 0;
      border-radius: var(--radius-md);
      background: var(--slot-booked-bg);
      color: var(--slot-booked-ink);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .block.own {
      background: var(--slot-own-bg);
      color: var(--slot-own-ink);
    }
    .block.expanded {
      z-index: 3;
      height: auto;
      align-self: start;
      overflow: visible;
      box-shadow: var(--elevation-2);
    }
    .state {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-bold);
    }
    .title {
      overflow: hidden;
      font-weight: var(--font-weight-medium);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .expanded .title {
      overflow: visible;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .more {
      font-size: var(--font-size-caption);
    }
    @media (prefers-reduced-motion: reduce) {
      .day {
        animation: none;
      }
    }
  `,
})
export class DayViewComponent {
  readonly columns = input.required<DayColumn[]>();
  readonly date = input.required<string>();
  readonly layout = input<DayLayout>('timeline');
  /** The organizer name remembered on this device; their bookings are labelled "Yours". */
  readonly owner = input<string>('');
  readonly now = input<Date>(new Date());

  readonly slotSelected = output<SlotSelection>();

  protected readonly expanded = signal<number | null>(null);

  protected readonly hours = Array.from({ length: ROWS }, (_, row) => row)
    .filter((row) => row % 4 === 0)
    .map((row) => ({ row, text: rowTime(row) }));

  protected readonly working = computed(() => isWorkingDay(this.date()));
  protected readonly models = computed<ColumnModel[]>(() =>
    this.columns().map((column) => buildColumn(column, this.date(), this.now(), this.owner())),
  );
  protected readonly empty = computed(
    () => this.working() && this.models().length > 0 && this.models().every((m) => m.blocks.length === 0),
  );

  protected detail(block: Block): string {
    return `${block.booking.title}, ${block.booking.organizer}, ${block.start} to ${block.end}`;
  }

  protected toggle(block: Block): void {
    this.expanded.update((current) => (current === block.booking.id ? null : block.booking.id));
  }

  protected select(model: ColumnModel, row: number): void {
    const { start, end } = freeSelection(model, row);
    this.slotSelected.emit({ roomId: model.room.id, date: this.date(), start, end });
  }

  /** Up and Down move the focus between the free rows of the same column; Tab keeps working. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.hasAttribute('data-free')) {
      return;
    }
    const column = target.getAttribute('data-col');
    const rows = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(`[data-free][data-col="${column}"]`),
    );
    const index = rows.indexOf(target) + (event.key === 'ArrowDown' ? 1 : -1);
    if (index >= 0 && index < rows.length) {
      event.preventDefault();
      rows[index].focus();
    }
  }
}
