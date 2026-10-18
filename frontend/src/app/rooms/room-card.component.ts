import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Room } from '../api';
import { IconComponent } from '../shared/icon.component';

/** A room as a card. Inactive rooms are greyed and carry the text label "Inactive" plus an icon (never color alone). */
@Component({
  selector: 'app-room-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class.inactive]="!room().active">
      <header>
        <h3 class="name">{{ room().name }}</h3>
        @if (!room().active) {
          <span class="badge"><app-icon name="pause" /> Inactive</span>
        }
      </header>
      <p class="capacity">Seats {{ room().capacity }}</p>
      @if (room().equipment.length > 0) {
        <ul class="equipment" aria-label="Equipment">
          @for (item of room().equipment; track item) {
            <li>{{ item }}</li>
          }
        </ul>
      } @else {
        <p class="none">No equipment</p>
      }
      <div class="actions"><ng-content /></div>
    </article>
  `,
  styles: `
    .card {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-3);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--elevation-1);
      transition: box-shadow var(--motion-fast) ease;
    }
    .card:hover {
      box-shadow: var(--elevation-2);
    }
    .card.inactive {
      background: var(--color-inactive-soft);
      color: var(--color-inactive);
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-1);
    }
    .name {
      margin: 0;
      font-size: var(--font-size-title);
      overflow-wrap: anywhere;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      flex: none;
      padding: 0.125rem var(--space-1);
      border-radius: var(--radius-pill);
      border: 1px solid var(--color-inactive);
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-bold);
    }
    .capacity {
      margin: 0;
      font-weight: var(--font-weight-medium);
    }
    .equipment {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .equipment li {
      padding: 0.125rem var(--space-1);
      border-radius: var(--radius-pill);
      background: var(--color-accent-soft);
      color: var(--color-ink);
      font-size: var(--font-size-caption);
      overflow-wrap: anywhere;
    }
    .inactive .equipment li {
      background: var(--color-surface-sunken);
      color: var(--color-inactive);
    }
    .none {
      margin: 0;
      color: var(--color-ink-muted);
      font-size: var(--font-size-caption);
    }
    .actions {
      margin-top: auto;
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class RoomCardComponent {
  readonly room = input.required<Room>();
}
