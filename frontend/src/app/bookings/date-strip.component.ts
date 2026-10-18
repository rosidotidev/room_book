import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { addDays, mondayOf } from '../shared/office-time';
import { IconComponent } from '../shared/icon.component';

const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Horizontal strip with the working days of one week and buttons for the previous and next week (phones). */
@Component({
  selector: 'app-date-strip',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="strip" aria-label="Choose a day">
      <button type="button" class="step" aria-label="Previous week" (click)="dateChange.emit(shift(-7))">
        <app-icon name="chevronLeft" />
      </button>
      @for (day of days(); track day.date) {
        <button type="button" class="day" [class.selected]="day.date === date()"
                [attr.aria-current]="day.date === date() ? 'date' : null" (click)="dateChange.emit(day.date)">
          <span class="name">{{ day.name }}</span>
          <span class="number">{{ day.number }}</span>
        </button>
      }
      <button type="button" class="step" aria-label="Next week" (click)="dateChange.emit(shift(7))">
        <app-icon name="chevronRight" />
      </button>
    </nav>
  `,
  styles: `
    .strip {
      display: flex;
      gap: 0.125rem;
      overflow-x: auto;
      padding: var(--space-1) 0;
    }
    button {
      flex: 1 0 var(--touch-target);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: var(--touch-target);
      min-height: var(--touch-target);
      padding: 0 0.25rem;
      border: 1px solid var(--color-divider);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-ink);
      font: inherit;
      cursor: pointer;
    }
    .step {
      flex: 0 0 var(--touch-target);
    }
    .day.selected {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: var(--color-accent-contrast);
    }
    .name {
      font-size: var(--font-size-caption);
    }
    .number {
      font-weight: var(--font-weight-bold);
    }
  `,
})
export class DateStripComponent {
  readonly date = input.required<string>();
  readonly dateChange = output<string>();

  protected readonly days = computed(() => {
    const monday = mondayOf(this.date());
    return NAMES.map((name, i) => {
      const date = addDays(monday, i);
      return { name, date, number: Number(date.slice(8, 10)) };
    });
  });

  protected shift(days: number): string {
    return addDays(this.date(), days);
  }
}
