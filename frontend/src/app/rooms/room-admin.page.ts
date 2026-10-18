import { BreakpointObserver } from '@angular/cdk/layout';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { BookingSummary, Room } from '../api';
import { PageComponent } from '../layout/page.component';
import { IconComponent } from '../shared/icon.component';
import { responsiveDialogConfig } from '../shared/responsive-dialog';
import { ProblemMessageComponent } from '../shared/problem-message.component';
import { problemMessage } from '../shared/problem-message';
import { DeactivateDialogComponent } from './deactivate-dialog.component';
import { RoomCardComponent } from './room-card.component';
import { RoomFormDialogComponent } from './room-form.component';
import { RoomsFacade } from './rooms.facade';

interface Warning {
  roomName: string;
  bookings: BookingSummary[];
}

/** Administration: add, edit, activate and deactivate rooms. */
@Component({
  selector: 'app-room-admin-page',
  imports: [DatePipe, MatButtonModule, PageComponent, RoomCardComponent, ProblemMessageComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page title="Manage rooms" subtitle="Add rooms, edit their details and take them in and out of service.">
      <button page-actions mat-flat-button type="button" class="add" (click)="openForm(null)">
        <app-icon name="add" /> Add room
      </button>

      @if (error(); as message) {
        <app-problem-message [message]="message" />
      }

      @if (warning(); as w) {
        <div class="warning" role="alert">
          <app-icon name="warning" />
          <div>
            <strong>{{ w.roomName }} has {{ w.bookings.length }} future
              {{ w.bookings.length === 1 ? 'booking' : 'bookings' }}.</strong>
            They were kept. Contact the organizers if the room should not be used.
            <ul>
              @for (b of w.bookings; track b.id) {
                <li>{{ b.title }} · {{ b.organizer }} · {{ b.start | date: 'medium' }}</li>
              }
            </ul>
          </div>
          <button mat-button type="button" (click)="warning.set(null)">Dismiss</button>
        </div>
      }

      @if (loading()) {
        <p role="status">Loading rooms…</p>
      } @else if (rooms().length === 0 && !error()) {
        <div class="empty">
          <h2>No rooms yet</h2>
          <p>Add the first meeting room to get started.</p>
          <button mat-flat-button type="button" class="add" (click)="openForm(null)">Add room</button>
        </div>
      } @else {
        <ul class="grid" aria-label="Rooms">
          @for (room of rooms(); track room.id) {
            <li>
              <app-room-card [room]="room">
                <button mat-stroked-button type="button" class="act" (click)="openForm(room)">
                  <app-icon name="edit" /> Edit
                </button>
                @if (room.active) {
                  <button mat-stroked-button type="button" class="act" (click)="deactivate(room)">
                    <app-icon name="pause" /> Deactivate
                  </button>
                } @else {
                  <button mat-flat-button type="button" class="act" (click)="activate(room)">
                    <app-icon name="play" /> Activate
                  </button>
                }
              </app-room-card>
            </li>
          }
        </ul>
      }
    </app-page>
  `,
  styles: `
    .add,
    .act {
      min-height: var(--touch-target);
      min-width: var(--touch-target);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    app-problem-message {
      display: block;
      margin-bottom: var(--space-2);
    }
    .warning {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
      padding: var(--space-2);
      border-radius: var(--radius-md);
      background: var(--color-warning-soft);
      color: var(--color-warning);
    }
    .warning > div {
      flex: 1 1 14rem;
    }
    .warning ul {
      margin: var(--space-1) 0 0;
      padding-left: var(--space-3);
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
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024.02px) {
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `,
})
export class RoomAdminPage implements OnInit {
  private readonly facade = inject(RoomsFacade);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly rooms = signal<Room[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly warning = signal<Warning | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.facade.list().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(problemMessage(e));
        this.loading.set(false);
      },
    });
  }

  protected openForm(room: Room | null): void {
    const ref = this.dialog.open(RoomFormDialogComponent, { ...responsiveDialogConfig(this.breakpoints), data: { room } });
    ref.afterClosed().subscribe((saved?: Room) => {
      if (saved) {
        this.refresh();
      }
    });
  }

  protected deactivate(room: Room): void {
    this.dialog
      .open(DeactivateDialogComponent, { data: { room }, width: '28rem', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((confirmed?: boolean) => {
        if (confirmed) {
          this.change(room, false);
        }
      });
  }

  protected activate(room: Room): void {
    this.change(room, true);
  }

  private change(room: Room, active: boolean): void {
    this.error.set(null);
    this.facade.setActive(room.id, active).subscribe({
      next: (result) => {
        this.warning.set(
          !active && result.futureBookings.length > 0
            ? { roomName: result.room.name, bookings: result.futureBookings }
            : null,
        );
        this.refresh();
      },
      error: (e: unknown) => this.error.set(problemMessage(e)),
    });
  }
}
