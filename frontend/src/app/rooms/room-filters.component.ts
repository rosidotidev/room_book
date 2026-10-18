import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime } from 'rxjs';
import { IconComponent } from '../shared/icon.component';
import { RoomFilter } from './rooms.facade';

export const FILTER_DEBOUNCE_MS = 300;

/**
 * Minimum capacity and equipment filters. Changes are emitted about 300 ms after the last edit;
 * an invalid capacity is flagged and ignored. On phones the controls sit in a collapsible panel.
 */
@Component({
  selector: 'app-room-filters',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="toggle" mat-stroked-button (click)="open.set(!open())"
            [attr.aria-expanded]="open()" aria-controls="filter-panel">
      <app-icon name="filter" /> Filters@if (activeCount() > 0) { ({{ activeCount() }}) }
    </button>
    <form id="filter-panel" class="panel" [class.open]="open()" [formGroup]="form" (ngSubmit)="$event.preventDefault()">
      <mat-form-field appearance="outline">
        <mat-label>Minimum capacity</mat-label>
        <input matInput type="number" inputmode="numeric" min="1" step="1" formControlName="minCapacity" />
        @if (form.controls.minCapacity.invalid) {
          <mat-error>Enter a whole number of 1 or more.</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Equipment</mat-label>
        <mat-select formControlName="equipment">
          <mat-option [value]="null">Any equipment</mat-option>
          @for (item of equipmentOptions(); track item) {
            <mat-option [value]="item">{{ item }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button type="button" mat-button class="clear" (click)="clear()" [disabled]="activeCount() === 0">
        Clear filters
      </button>
    </form>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-3);
    }
    .toggle {
      min-height: var(--touch-target);
    }
    .panel {
      display: none;
      margin-top: var(--space-2);
    }
    .panel.open {
      display: grid;
      gap: var(--space-1);
    }
    .clear {
      min-height: var(--touch-target);
      justify-self: start;
    }
    @media (min-width: 600px) {
      .toggle {
        display: none;
      }
      .panel,
      .panel.open {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--space-2);
        margin-top: 0;
      }
      mat-form-field {
        flex: 1 1 14rem;
        max-width: 20rem;
      }
      .clear {
        margin-top: var(--space-1);
      }
    }
  `,
})
export class RoomFiltersComponent {
  /** Equipment items offered in the select (built from the whole catalog by the page). */
  readonly equipmentOptions = input<string[]>([]);
  readonly filterChange = output<RoomFilter>();

  readonly open = signal(false);
  readonly activeCount = signal(0);

  readonly form = new FormGroup({
    minCapacity: new FormControl<number | null>(null, { validators: [(c) => capacityError(c.value)] }),
    equipment: new FormControl<string | null>(null),
  });

  constructor() {
    this.form.valueChanges
      .pipe(debounceTime(FILTER_DEBOUNCE_MS), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.emit());
  }

  clear(): void {
    this.form.reset({ minCapacity: null, equipment: null });
    this.activeCount.set(0);
  }

  private emit(): void {
    if (this.form.controls.minCapacity.invalid) {
      return; // flagged next to the field; the list keeps the last valid result
    }
    const { minCapacity, equipment } = this.form.getRawValue();
    this.activeCount.set((minCapacity !== null ? 1 : 0) + (equipment ? 1 : 0));
    this.filterChange.emit({ minCapacity, equipment });
  }
}

function capacityError(value: number | null): { capacity: true } | null {
  if (value === null || (Number.isInteger(value) && value >= 1)) {
    return null;
  }
  return { capacity: true };
}
