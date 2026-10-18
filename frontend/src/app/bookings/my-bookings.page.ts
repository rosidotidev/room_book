import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Booking } from '../api';
import { PageComponent } from '../layout/page.component';
import { NOW } from '../shared/clock';
import { IconComponent } from '../shared/icon.component';
import { canCancel, hasStarted, officeParts } from '../shared/office-time';
import { OrganizerStore } from '../shared/organizer-store';
import { ProblemMessageComponent } from '../shared/problem-message.component';
import { problemMessage } from '../shared/problem-message';
import { DESKTOP_QUERY } from '../shared/responsive-dialog';
import { BookingsFacade } from './bookings.facade';

interface Row {
  booking: Booking;
  roomName: string;
  date: string;
  time: string;
  cancelled: boolean;
  canCancel: boolean;
  reason: string;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** The employee's own bookings: cards on phones and tablets, a table with a status column on desktops. */
@Component({
  selector: 'app-my-bookings-page',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, PageComponent, ProblemMessageComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page title="My bookings" subtitle="Enter your name to see and cancel your bookings.">
      <form class="lookup" (ngSubmit)="search()">
        <mat-form-field appearance="outline" class="name">
          <mat-label>Your name</mat-label>
          <input matInput name="name" autocomplete="name" [ngModel]="name()" (ngModelChange)="name.set($event)" />
        </mat-form-field>
        <button mat-flat-button type="submit" class="go">Show my bookings</button>
      </form>

      @if (message(); as text) {
        <app-problem-message [message]="text" />
      }

      @switch (status()) {
        @case ('idle') {
          <p class="hint"><app-icon name="person" /> Enter the name you booked under.</p>
        }
        @case ('loading') {
          <p role="status">Loading your bookings…</p>
        }
        @case ('error') {
          <button mat-flat-button type="button" class="go" (click)="search()">Retry</button>
        }
        @default {
          @if (rows().length === 0) {
            <div class="empty">
              <app-icon name="calendar" />
              <h2>No bookings found</h2>
              <p>There are no bookings under this name yet.</p>
            </div>
          } @else if (desktop()) {
            <table class="table">
              <thead>
                <tr><th>Room</th><th>Date</th><th>Time</th><th>Title</th><th>Status</th><th><span class="sr-only">Action</span></th></tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.booking.id) {
                  <tr [class.cancelled]="row.cancelled">
                    <td>{{ row.roomName }}</td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.time }}</td>
                    <td class="wrap">{{ row.booking.title }}</td>
                    <td>
                      <span class="status" [class.cancelled]="row.cancelled">
                        <app-icon [name]="row.cancelled ? 'close' : 'check'" />{{ row.cancelled ? 'Cancelled' : 'Confirmed' }}
                      </span>
                    </td>
                    <td>
                      @if (!row.cancelled) {
                        <button mat-stroked-button type="button" class="act" [disabled]="!row.canCancel"
                                [attr.aria-describedby]="'why-' + row.booking.id" (click)="cancel(row)">Cancel</button>
                        @if (!row.canCancel) {
                          <span class="why" [id]="'why-' + row.booking.id">{{ row.reason }}</span>
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <ul class="cards" aria-label="My bookings">
              @for (row of rows(); track row.booking.id) {
                <li class="card" [class.cancelled]="row.cancelled">
                  <header>
                    <h3>{{ row.booking.title }}</h3>
                    <span class="status" [class.cancelled]="row.cancelled">
                      <app-icon [name]="row.cancelled ? 'close' : 'check'" />{{ row.cancelled ? 'Cancelled' : 'Confirmed' }}
                    </span>
                  </header>
                  <p>{{ row.roomName }} · {{ row.date }} · {{ row.time }}</p>
                  @if (!row.cancelled) {
                    <button mat-stroked-button type="button" class="act" [disabled]="!row.canCancel"
                            [attr.aria-describedby]="'why-' + row.booking.id" (click)="cancel(row)">Cancel booking</button>
                    @if (!row.canCancel) {
                      <p class="why" [id]="'why-' + row.booking.id">{{ row.reason }}</p>
                    }
                  }
                </li>
              }
            </ul>
          }
        }
      }
    </app-page>
  `,
  styles: `
    .lookup {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
    }
    .name {
      flex: 1 1 14rem;
      max-width: 22rem;
    }
    .go,
    .act {
      min-height: var(--touch-target);
      min-width: var(--touch-target);
    }
    .hint,
    .empty {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-ink-muted);
    }
    .empty {
      flex-direction: column;
      justify-content: center;
      padding: var(--space-6) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      text-align: center;
    }
    .empty h2,
    .empty p {
      margin: 0;
    }
    .cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .card {
      display: grid;
      gap: var(--space-1);
      padding: var(--space-3);
      background: var(--slot-free-bg);
      border-radius: var(--radius-lg);
      box-shadow: var(--elevation-1);
    }
    .card.cancelled {
      background: var(--slot-cancelled-bg);
      color: var(--slot-cancelled-ink);
    }
    .card header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-1);
    }
    .card h3 {
      margin: 0;
      font-size: var(--font-size-title);
      overflow-wrap: anywhere;
    }
    .card p {
      margin: 0;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      flex: none;
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-bold);
      color: var(--color-success);
    }
    .status.cancelled {
      color: var(--slot-cancelled-ink);
    }
    .why {
      color: var(--color-ink-muted);
      font-size: var(--font-size-caption);
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--elevation-1);
    }
    th,
    td {
      padding: var(--space-1) var(--space-2);
      border-bottom: var(--border-thin);
      text-align: left;
      vertical-align: middle;
    }
    td.wrap {
      overflow-wrap: anywhere;
    }
    tr.cancelled td {
      background: var(--slot-cancelled-bg);
      color: var(--slot-cancelled-ink);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    @media (min-width: 600px) {
      .cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class MyBookingsPage implements OnInit {
  private readonly facade = inject(BookingsFacade);
  private readonly store = inject(OrganizerStore);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly clock = inject(NOW);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly name = signal(this.store.read());
  protected readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly message = signal<string | null>(null);
  protected readonly desktop = signal(false);

  private readonly bookings = signal<Booking[]>([]);
  private readonly roomNames = signal<Map<number, string>>(new Map());
  protected readonly now = signal(this.clock());

  protected readonly rows = computed<Row[]>(() =>
    this.bookings().map((booking) => {
      const start = officeParts(booking.start);
      const end = officeParts(booking.end);
      const cancelled = booking.status === 'CANCELLED';
      const allowed = !cancelled && canCancel(booking.start, this.now());
      const started = hasStarted(booking.start, this.now());
      return {
        booking,
        roomName: this.roomNames().get(booking.roomId) ?? `Room ${booking.roomId}`,
        date: dateFormat.format(new Date(`${start.date}T12:00:00Z`)),
        time: `${start.time}–${end.time}`,
        cancelled,
        canCancel: allowed,
        reason: started ? 'Already started' : 'Starts in less than an hour',
      };
    }),
  );

  ngOnInit(): void {
    this.breakpoints
      .observe([DESKTOP_QUERY])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.desktop.set(!!state.breakpoints[DESKTOP_QUERY]));
    this.facade.allRooms().subscribe({
      next: (rooms) => this.roomNames.set(new Map(rooms.map((r) => [r.id, r.name]))),
      error: () => undefined, // names fall back to "Room n"
    });
    if (this.name().trim()) {
      this.search();
    }
  }

  protected search(): void {
    const name = this.name().trim();
    this.message.set(null);
    if (!name) {
      this.status.set('idle');
      this.bookings.set([]);
      return;
    }
    this.store.write(name);
    this.status.set('loading');
    this.now.set(this.clock());
    this.facade.byOrganizer(name).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.status.set('ready');
      },
      error: (e: unknown) => {
        this.message.set(problemMessage(e));
        this.status.set('error');
      },
    });
  }

  protected cancel(row: Row): void {
    this.message.set(null);
    this.facade.cancel(row.booking.id).subscribe({
      next: (updated) => {
        // the booking stays in the list, marked as cancelled
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
      },
      error: (e: unknown) => this.message.set(problemMessage(e)),
    });
  }
}
