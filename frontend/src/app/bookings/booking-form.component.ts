import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Booking, Room } from '../api';
import { ProblemMessageComponent } from '../shared/problem-message.component';
import { problemMessage } from '../shared/problem-message';
import { NOW } from '../shared/clock';
import { OrganizerStore } from '../shared/organizer-store';
import { DAY_END_MINUTES, DAY_START_MINUTES, SLOT_MINUTES, isWorkingDay, minutesOf, timeOf, toOfficeIso } from '../shared/office-time';
import { BookingsFacade } from './bookings.facade';

export const TEXT_MAX = 100;
export const MAX_MINUTES = 4 * 60;

function steps(from: number, to: number): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m += SLOT_MINUTES) {
    out.push(timeOf(m));
  }
  return out;
}

/** Start 08:00-19:45 and end 08:15-20:00 in 15-minute steps. */
export const START_TIMES = steps(DAY_START_MINUTES, DAY_END_MINUTES - SLOT_MINUTES);
export const END_TIMES = steps(DAY_START_MINUTES + SLOT_MINUTES, DAY_END_MINUTES);

export interface BookingFormInitial {
  roomId?: number | null;
  date?: string;
  start?: string;
  end?: string;
}

const trimmedRequired = (c: AbstractControl): ValidationErrors | null =>
  String(c.value ?? '').trim() === '' ? { required: true } : null;

const trimmedMax = (c: AbstractControl): ValidationErrors | null =>
  String(c.value ?? '').trim().length > TEXT_MAX ? { maxlength: true } : null;

const workingDay = (c: AbstractControl): ValidationErrors | null =>
  !c.value || isWorkingDay(String(c.value)) ? null : { weekend: true };

/**
 * Booking form. The checks only help the user early; the system stays the authority on the rules and its
 * refusals are shown above the actions in plain language, with every entered value kept.
 */
@Component({
  selector: 'app-booking-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, ProblemMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h2 class="title">Book a room</h2>

      @if (refusal(); as message) {
        <app-problem-message [message]="message" />
      }

      <mat-form-field appearance="outline">
        <mat-label>Room</mat-label>
        <mat-select formControlName="roomId" required>
          @for (room of rooms(); track room.id) {
            <mat-option [value]="room.id">{{ room.name }}</mat-option>
          }
        </mat-select>
        @if (form.controls.roomId.invalid) {
          <mat-error>Choose a room.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Date</mat-label>
        <input matInput type="date" formControlName="date" required />
        @if (form.controls.date.hasError('weekend')) {
          <mat-error>Bookings are only possible Monday to Friday.</mat-error>
        } @else if (form.controls.date.invalid) {
          <mat-error>Choose a date.</mat-error>
        }
      </mat-form-field>

      <div class="times">
        <mat-form-field appearance="outline">
          <mat-label>Start</mat-label>
          <mat-select formControlName="start" required>
            @for (t of startTimes; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select>
          @if (form.controls.start.invalid) {
            <mat-error>Choose a start time.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>End</mat-label>
          <mat-select formControlName="end" required>
            @for (t of endTimes; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select>
          @if (form.controls.end.invalid) {
            <mat-error>Choose an end time.</mat-error>
          }
        </mat-form-field>
      </div>
      @if (timeProblem(); as problem) {
        <p class="field-error" role="alert">{{ problem }}</p>
      }

      <mat-form-field appearance="outline">
        <mat-label>Title</mat-label>
        <input matInput formControlName="title" autocomplete="off" required />
        @if (form.controls.title.hasError('maxlength')) {
          <mat-error>Use at most {{ textMax }} characters.</mat-error>
        } @else if (form.controls.title.invalid) {
          <mat-error>Enter a title for the booking.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Organizer</mat-label>
        <input matInput formControlName="organizer" autocomplete="name" required />
        @if (form.controls.organizer.hasError('maxlength')) {
          <mat-error>Use at most {{ textMax }} characters.</mat-error>
        } @else if (form.controls.organizer.invalid) {
          <mat-error>Enter your name.</mat-error>
        }
      </mat-form-field>

      <div class="actions">
        <button mat-stroked-button type="button" (click)="cancelled.emit()">Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Booking…' : 'Book room' }}</button>
      </div>
    </form>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-1);
      padding: var(--space-2);
    }
    .title {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-title);
    }
    .times {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-1);
    }
    .field-error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-medium);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-1);
      margin-top: var(--space-1);
    }
    .actions button {
      min-height: var(--touch-target);
      min-width: var(--touch-target);
    }
    @media (min-width: 600px) {
      .form {
        padding: var(--space-3);
      }
    }
  `,
})
export class BookingFormComponent implements OnInit {
  private readonly facade = inject(BookingsFacade);
  private readonly store = inject(OrganizerStore);
  private readonly now = inject(NOW);

  readonly rooms = input.required<Room[]>();
  readonly initial = input<BookingFormInitial>({});
  readonly saved = output<Booking>();
  readonly cancelled = output<void>();

  protected readonly startTimes = START_TIMES;
  protected readonly endTimes = END_TIMES;
  protected readonly textMax = TEXT_MAX;
  protected readonly saving = signal(false);
  protected readonly refusal = signal<string | null>(null);
  protected readonly submitted = signal(false);

  readonly form = new FormGroup({
    roomId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required, workingDay] }),
    start: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    end: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [trimmedRequired, trimmedMax] }),
    organizer: new FormControl('', { nonNullable: true, validators: [trimmedRequired, trimmedMax] }),
  });

  ngOnInit(): void {
    const initial = this.initial();
    this.form.patchValue({
      roomId: initial.roomId ?? null,
      date: initial.date ?? '',
      start: initial.start ?? '',
      end: initial.end ?? '',
      organizer: this.store.read(),
    });
  }

  /** The problem with the chosen times, once the user tried to submit or touched them. */
  protected timeProblem(): string | null {
    const { date, start, end } = this.form.getRawValue();
    const touched = this.submitted() || (this.form.controls.start.touched && this.form.controls.end.touched);
    if (!touched || !start || !end) {
      return null;
    }
    return this.timeRuleViolation(date, start, end);
  }

  private timeRuleViolation(date: string, start: string, end: string): string | null {
    const length = minutesOf(end) - minutesOf(start);
    if (length <= 0) {
      return 'The end must be after the start.';
    }
    if (length > MAX_MINUTES) {
      return 'A booking can last at most 4 hours.';
    }
    if (date && Date.parse(toOfficeIso(date, start)) < this.now().getTime()) {
      return 'That time has already passed. Choose a later start.';
    }
    return null;
  }

  protected submit(): void {
    this.refusal.set(null);
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (this.form.invalid || this.timeRuleViolation(value.date, value.start, value.end)) {
      return; // blocked: the messages next to the fields explain what to fix
    }
    const organizer = value.organizer.trim();
    this.saving.set(true);
    this.facade
      .create({
        roomId: Number(value.roomId),
        title: value.title.trim(),
        organizer,
        start: toOfficeIso(value.date, value.start),
        end: toOfficeIso(value.date, value.end),
      })
      .subscribe({
        next: (booking) => {
          this.saving.set(false);
          this.store.write(organizer);
          this.saved.emit(booking);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.refusal.set(problemMessage(error)); // every entered value stays as typed
        },
      });
  }
}

/** Dialog wrapper: full screen, dialog or side panel, as configured by the opener. */
@Component({
  selector: 'app-booking-form-dialog',
  imports: [BookingFormComponent],
  template: `<app-booking-form [rooms]="data.rooms" [initial]="data.initial" (saved)="ref.close($event)" (cancelled)="ref.close()" />`,
})
export class BookingFormDialogComponent {
  protected readonly data = inject<{ rooms: Room[]; initial: BookingFormInitial }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<BookingFormDialogComponent, Booking>);
}
