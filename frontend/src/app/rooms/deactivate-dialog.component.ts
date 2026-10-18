import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Room } from '../api';

/** Asks for confirmation before a room is taken out of service. Nothing is deleted. */
@Component({
  selector: 'app-deactivate-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Deactivate {{ data.room.name }}?</h2>
    <mat-dialog-content>
      <p>
        The room stays in the catalog, marked <strong>Inactive</strong>, and can be activated again at any time.
        Nothing is deleted. If it has future bookings, they are listed once the room is deactivated.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" [mat-dialog-close]="false" class="action">Cancel</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true" class="action" cdkFocusInitial>Deactivate</button>
    </mat-dialog-actions>
  `,
  styles: `
    .action {
      min-height: var(--touch-target);
      min-width: var(--touch-target);
    }
  `,
})
export class DeactivateDialogComponent {
  protected readonly data = inject<{ room: Room }>(MAT_DIALOG_DATA);
}
