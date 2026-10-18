import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Room } from '../api';
import { ProblemMessageComponent } from '../shared/problem-message.component';
import { FieldError, RoomsFacade, toFieldError } from './rooms.facade';

export const NAME_MAX = 100;
export const CAPACITY_MAX = 1000;
export const EQUIPMENT_MAX_ITEMS = 20;
export const EQUIPMENT_ITEM_MAX = 50;

function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

function trimmedMax(max: number) {
  return (control: AbstractControl): ValidationErrors | null =>
    String(control.value ?? '').trim().length > max ? { maxlength: true } : null;
}

function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return value === null || value === '' || Number.isInteger(Number(value)) ? null : { whole: true };
}

/**
 * Add / edit form. The checks mirror the contract and only help the user early;
 * the backend remains the authority and its rejections are shown next to the field, with the data kept.
 */
@Component({
  selector: 'app-room-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatChipsModule, MatButtonModule, ProblemMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h2 class="title">{{ room() ? 'Edit room' : 'Add room' }}</h2>

      @if (formError(); as error) {
        <app-problem-message [message]="error" />
      }

      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" autocomplete="off" [attr.maxlength]="null" required />
        @if (form.controls.name.hasError('server')) {
          <mat-error>{{ form.controls.name.getError('server') }}</mat-error>
        } @else if (form.controls.name.hasError('required')) {
          <mat-error>Enter a name for the room.</mat-error>
        } @else if (form.controls.name.hasError('maxlength')) {
          <mat-error>Use at most {{ nameMax }} characters.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Capacity</mat-label>
        <input matInput type="number" inputmode="numeric" formControlName="capacity" required />
        @if (form.controls.capacity.hasError('server')) {
          <mat-error>{{ form.controls.capacity.getError('server') }}</mat-error>
        } @else if (form.controls.capacity.invalid) {
          <mat-error>Enter a whole number from 1 to {{ capacityMax }}.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Equipment</mat-label>
        <mat-chip-grid #grid aria-label="Equipment">
          @for (item of equipment(); track item) {
            <mat-chip-row (removed)="removeItem(item)">
              {{ item }}
              <button matChipRemove type="button" [attr.aria-label]="'Remove ' + item">×</button>
            </mat-chip-row>
          }
          <input placeholder="Add an item and press Enter" [matChipInputFor]="grid" (matChipInputTokenEnd)="addItem($event)"
                 [matChipInputSeparatorKeyCodes]="separators" />
        </mat-chip-grid>
        <mat-hint>Optional. Up to {{ equipmentMaxItems }} items.</mat-hint>
      </mat-form-field>
      @if (equipmentError(); as error) {
        <p class="field-error" role="alert">{{ error }}</p>
      }

      <div class="actions">
        <button mat-stroked-button type="button" (click)="cancelled.emit()">Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save room' }}</button>
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
export class RoomFormComponent implements OnInit {
  private readonly facade = inject(RoomsFacade);

  /** The room being edited; absent when adding. */
  readonly room = input<Room | null>(null);
  readonly saved = output<Room>();
  readonly cancelled = output<void>();

  protected readonly nameMax = NAME_MAX;
  protected readonly capacityMax = CAPACITY_MAX;
  protected readonly equipmentMaxItems = EQUIPMENT_MAX_ITEMS;
  protected readonly separators = [13, 188];
  protected readonly saving = signal(false);
  protected readonly equipment = signal<string[]>([]);
  protected readonly equipmentError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [trimmedRequired, trimmedMax(NAME_MAX)] }),
    capacity: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(CAPACITY_MAX), wholeNumber],
    }),
  });

  ngOnInit(): void {
    const room = this.room();
    if (room) {
      this.form.patchValue({ name: room.name, capacity: room.capacity });
      this.equipment.set([...room.equipment]);
    }
  }

  protected addItem(event: MatChipInputEvent): void {
    const text = (event.value ?? '').trim();
    if (text === '') {
      event.chipInput.clear();
      return;
    }
    if (text.length > EQUIPMENT_ITEM_MAX) {
      this.equipmentError.set(`Each item can have at most ${EQUIPMENT_ITEM_MAX} characters.`);
      return;
    }
    if (this.equipment().length >= EQUIPMENT_MAX_ITEMS) {
      this.equipmentError.set(`Use at most ${EQUIPMENT_MAX_ITEMS} equipment items.`);
      return;
    }
    const exists = this.equipment().some((e) => e.toLowerCase() === text.toLowerCase());
    if (!exists) {
      this.equipment.update((items) => [...items, text]);
    }
    this.equipmentError.set(null);
    event.chipInput.clear();
  }

  protected removeItem(item: string): void {
    this.equipment.update((items) => items.filter((i) => i !== item));
    this.equipmentError.set(null);
  }

  protected submit(): void {
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return; // blocked: the messages next to the fields explain what to fix
    }
    const input = {
      name: this.form.controls.name.value.trim(),
      capacity: Number(this.form.controls.capacity.value),
      equipment: this.equipment(),
    };
    const room = this.room();
    this.saving.set(true);
    const call = room ? this.facade.update(room.id, input) : this.facade.create(input);
    call.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.showRejection(toFieldError(error));
      },
    });
  }

  /** Shows the rejection next to the field it concerns; the entered data stays untouched. */
  private showRejection(error: FieldError): void {
    switch (error.field) {
      case 'name':
        this.form.controls.name.setErrors({ server: error.message });
        this.form.controls.name.markAsTouched();
        break;
      case 'capacity':
        this.form.controls.capacity.setErrors({ server: error.message });
        this.form.controls.capacity.markAsTouched();
        break;
      case 'equipment':
        this.equipmentError.set(error.message);
        break;
      default:
        this.formError.set(error.message);
    }
  }
}

/** Dialog wrapper: full screen on phones, right-anchored panel on desktop (configured by the opener). */
@Component({
  selector: 'app-room-form-dialog',
  imports: [RoomFormComponent],
  template: `<app-room-form [room]="data.room" (saved)="ref.close($event)" (cancelled)="ref.close()" />`,
})
export class RoomFormDialogComponent {
  protected readonly data = inject<{ room: Room | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<RoomFormDialogComponent, Room>);
}
