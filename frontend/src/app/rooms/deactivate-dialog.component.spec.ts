import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { DeactivateDialogComponent } from './deactivate-dialog.component';

describe('DeactivateDialogComponent', () => {
  it('names the room, explains nothing is deleted and offers Cancel and Deactivate', () => {
    TestBed.configureTestingModule({
      imports: [DeactivateDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { room: { id: 1, name: 'Aurora', capacity: 4, equipment: [], active: true } } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(DeactivateDialogComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Deactivate Aurora?');
    expect(el.textContent).toContain('Nothing is deleted');
    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Cancel', 'Deactivate']);
  });
});
