import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Booking, Room } from '../api';
import { PageComponent } from '../layout/page.component';
import { NOW } from '../shared/clock';
import { IconComponent } from '../shared/icon.component';
import { addDays, nextWorkingDay, nowInOffice } from '../shared/office-time';
import { OrganizerStore } from '../shared/organizer-store';
import { ProblemMessageComponent } from '../shared/problem-message.component';
import { problemMessage } from '../shared/problem-message';
import { DESKTOP_QUERY, PHONE_QUERY, responsiveDialogConfig } from '../shared/responsive-dialog';
import { BookingFormDialogComponent, BookingFormInitial } from './booking-form.component';
import { BookingsFacade, DayColumn } from './bookings.facade';
import { DateStripComponent } from './date-strip.component';
import { DayLayout, DayViewComponent, SlotSelection } from './day-view.component';

type Status = 'loading' | 'ready' | 'error';

/**
 * Day view with its controls: room and date, the adaptive layout (agenda, timeline or grid),
 * and the booking form. The day reloads after a booking, on a change of room or date, and on Retry only.
 */
@Component({
  selector: 'app-availability-page',
  imports: [
    RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    PageComponent, DayViewComponent, DateStripComponent, ProblemMessageComponent, IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page title="Availability" subtitle="See when a room is free and book it.">
      <button page-actions mat-flat-button type="button" class="book" (click)="openForm({})" [disabled]="rooms().length === 0">
        <app-icon name="add" /> Book a room
      </button>

      @if (status() === 'error') {
        <div class="state">
          <app-problem-message [message]="errorMessage()" />
          <button mat-flat-button type="button" class="retry" (click)="reload()">Retry</button>
        </div>
      } @else if (status() === 'ready' && rooms().length === 0) {
        <div class="empty">
          <app-icon name="rooms" />
          <h2>No rooms to book yet</h2>
          <p>An administrator needs to add or activate a room first.</p>
          <a mat-flat-button routerLink="/rooms/admin">Manage rooms</a>
        </div>
      } @else {
        <div class="controls">
          @if (layout() !== 'grid') {
            <mat-form-field appearance="outline" class="room">
              <mat-label>Room</mat-label>
              <mat-select [value]="roomId()" (selectionChange)="chooseRoom($event.value)">
                @for (room of rooms(); track room.id) {
                  <mat-option [value]="room.id">{{ room.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          @if (layout() === 'agenda') {
            <app-date-strip [date]="date()" (dateChange)="chooseDate($event)" />
          } @else {
            <div class="dates">
              <button mat-stroked-button type="button" class="step" aria-label="Previous day" (click)="chooseDate(shift(-1))">
                <app-icon name="chevronLeft" />
              </button>
              <mat-form-field appearance="outline" class="date">
                <mat-label>Date</mat-label>
                <input matInput type="date" [value]="date()" (change)="chooseDate($any($event.target).value)" />
              </mat-form-field>
              <button mat-stroked-button type="button" class="step" aria-label="Next day" (click)="chooseDate(shift(1))">
                <app-icon name="chevronRight" />
              </button>
            </div>
          }
        </div>

        @if (status() === 'loading') {
          <p role="status">Loading the day…</p>
        } @else {
          <app-day-view [columns]="columns()" [date]="date()" [layout]="layout()" [owner]="owner()"
                        [now]="now()" (slotSelected)="select($event)" />
        }
      }
    </app-page>
  `,
  styles: `
    .book,
    .retry,
    .step {
      min-height: var(--touch-target);
      min-width: var(--touch-target);
    }
    .controls {
      display: grid;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
    }
    .dates {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      min-width: 0;
    }
    .date {
      flex: 1 1 8rem;
      min-width: 0;
      max-width: 16rem;
    }
    .state {
      display: grid;
      gap: var(--space-2);
      justify-items: start;
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: var(--space-1);
      padding: var(--space-6) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      text-align: center;
    }
    .empty h2,
    .empty p {
      margin: 0;
    }
    @media (min-width: 600px) {
      .controls {
        grid-template-columns: minmax(12rem, 18rem) 1fr;
        align-items: start;
        gap: var(--space-2);
      }
    }
  `,
})
export class AvailabilityPage implements OnInit {
  private readonly facade = inject(BookingsFacade);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly store = inject(OrganizerStore);
  private readonly clock = inject(NOW);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rooms = signal<Room[]>([]);
  protected readonly roomId = signal<number | null>(null);
  protected readonly date = signal(nextWorkingDay(nowInOffice(this.clock()).date));
  protected readonly layout = signal<DayLayout>('timeline');
  protected readonly status = signal<Status>('loading');
  protected readonly errorMessage = signal('');
  protected readonly columns = signal<DayColumn[]>([]);
  protected readonly now = signal(this.clock());
  protected readonly owner = signal(this.store.read());

  private readonly visibleRooms = computed(() =>
    this.layout() === 'grid' ? this.rooms() : this.rooms().filter((r) => r.id === this.roomId()),
  );

  ngOnInit(): void {
    this.breakpoints
      .observe([PHONE_QUERY, DESKTOP_QUERY])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        const next: DayLayout = state.breakpoints[PHONE_QUERY] ? 'agenda' : state.breakpoints[DESKTOP_QUERY] ? 'grid' : 'timeline';
        if (next !== this.layout()) {
          this.layout.set(next);
          if (this.status() === 'ready') {
            this.loadDay();
          }
        }
      });
    this.reload();
  }

  protected reload(): void {
    this.status.set('loading');
    this.facade.activeRooms().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        if (!rooms.some((r) => r.id === this.roomId())) {
          this.roomId.set(rooms[0]?.id ?? null);
        }
        this.loadDay();
      },
      error: (e: unknown) => this.fail(e),
    });
  }

  protected loadDay(): void {
    this.now.set(this.clock());
    const rooms = this.visibleRooms();
    this.facade.days(rooms, this.date()).subscribe({
      next: (columns) => {
        this.columns.set(columns);
        this.status.set('ready');
      },
      error: (e: unknown) => this.fail(e),
    });
  }

  protected chooseRoom(id: number): void {
    this.roomId.set(id);
    this.loadDay();
  }

  protected chooseDate(date: string): void {
    if (!date) {
      return;
    }
    this.date.set(date);
    this.loadDay();
  }

  protected shift(days: number): string {
    return addDays(this.date(), days);
  }

  protected select(selection: SlotSelection): void {
    this.openForm({ roomId: selection.roomId, date: selection.date, start: selection.start, end: selection.end });
  }

  protected openForm(initial: BookingFormInitial): void {
    const data = {
      rooms: this.rooms(),
      initial: { roomId: this.roomId(), date: this.date(), ...initial },
    };
    this.dialog
      .open(BookingFormDialogComponent, { ...responsiveDialogConfig(this.breakpoints), data })
      .afterClosed()
      .subscribe((saved?: Booking) => {
        if (saved) {
          this.owner.set(this.store.read());
          this.date.set(saved.start.slice(0, 10));
          if (this.layout() !== 'grid') {
            this.roomId.set(saved.roomId);
          }
          this.loadDay();
        }
      });
  }

  private fail(error: unknown): void {
    this.errorMessage.set(problemMessage(error));
    this.status.set('error');
  }
}
