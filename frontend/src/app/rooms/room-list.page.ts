import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Room } from '../api';
import { PageComponent } from '../layout/page.component';
import { IconComponent } from '../shared/icon.component';
import { ProblemMessageComponent } from '../shared/problem-message.component';
import { problemMessage } from '../shared/problem-message';
import { RoomCardComponent } from './room-card.component';
import { RoomFiltersComponent } from './room-filters.component';
import { RoomFilter, RoomsFacade } from './rooms.facade';

type Status = 'loading' | 'ready' | 'error';

/** Room list with debounced filters, inactive styling and empty states. */
@Component({
  selector: 'app-room-list-page',
  imports: [
    RouterLink,
    MatButtonModule,
    PageComponent,
    RoomCardComponent,
    RoomFiltersComponent,
    ProblemMessageComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page title="Rooms" subtitle="Find a meeting room by size and equipment.">
      @if (status() !== 'error' && catalog().length > 0) {
        <app-room-filters [equipmentOptions]="equipmentOptions()" (filterChange)="applyFilter($event)" />
      }

      @switch (status()) {
        @case ('loading') {
          <p class="state" role="status">Loading rooms…</p>
        }
        @case ('error') {
          <div class="state">
            <app-problem-message [message]="errorMessage()" />
            <button mat-flat-button type="button" class="retry" (click)="load()">Retry</button>
          </div>
        }
        @default {
          @if (catalog().length === 0) {
            <div class="empty">
              <app-icon name="rooms" />
              <h2>No rooms yet</h2>
              <p>Add the first meeting room to get started.</p>
              <a mat-flat-button routerLink="/rooms/admin">Add room</a>
            </div>
          } @else if (rooms().length === 0) {
            <div class="empty">
              <app-icon name="info" />
              <h2>No rooms match</h2>
              <p>Try a smaller capacity or a different equipment item.</p>
              <button mat-flat-button type="button" (click)="clearFilters()">Clear filters</button>
            </div>
          } @else {
            <ul class="grid" aria-label="Rooms">
              @for (room of rooms(); track room.id) {
                <li><app-room-card [room]="room" /></li>
              }
            </ul>
          }
        }
      }
    </app-page>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .state {
      display: grid;
      gap: var(--space-2);
      justify-items: start;
    }
    .retry {
      min-height: var(--touch-target);
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: var(--space-1);
      padding: var(--space-6) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      text-align: center;
      color: var(--color-ink-muted);
      font-size: var(--font-size-title);
    }
    .empty h2 {
      margin: 0;
      color: var(--color-ink);
    }
    .empty p {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-body);
    }
    .empty a,
    .empty button {
      min-height: var(--touch-target);
    }
    @media (min-width: 600px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024.02px) {
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (min-width: 1400px) {
      .grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `,
})
export class RoomListPage implements OnInit {
  private readonly facade = inject(RoomsFacade);
  private readonly filters = viewChild(RoomFiltersComponent);

  protected readonly status = signal<Status>('loading');
  protected readonly errorMessage = signal('');
  /** The whole catalog, unfiltered: drives the equipment choices and the "no rooms yet" state. */
  protected readonly catalog = signal<Room[]>([]);
  protected readonly rooms = signal<Room[]>([]);

  protected readonly equipmentOptions = computed(() => {
    const byKey = new Map<string, string>();
    for (const room of this.catalog()) {
      for (const item of room.equipment) {
        const key = item.trim().toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, item);
        }
      }
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.facade.list().subscribe({
      next: (rooms) => {
        this.catalog.set(rooms);
        this.rooms.set(rooms);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(problemMessage(error));
        this.status.set('error');
      },
    });
  }

  protected applyFilter(filter: RoomFilter): void {
    if (filter.minCapacity === null && !filter.equipment) {
      this.rooms.set(this.catalog());
      return;
    }
    this.facade.list(filter).subscribe({
      next: (rooms) => this.rooms.set(rooms),
      error: (error: unknown) => {
        this.errorMessage.set(problemMessage(error));
        this.status.set('error');
      },
    });
  }

  protected clearFilters(): void {
    this.filters()?.clear();
    this.rooms.set(this.catalog());
  }
}
