import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { DateStripComponent } from './date-strip.component';

function render(date: string) {
  const fixture = TestBed.createComponent(DateStripComponent);
  fixture.componentRef.setInput('date', date);
  const changed = vi.fn();
  fixture.componentInstance.dateChange.subscribe(changed);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, changed, buttons: () => Array.from(el.querySelectorAll<HTMLButtonElement>('button')) };
}

describe('DateStripComponent', () => {
  it('shows Monday to Friday of the selected week and marks the selected day', () => {
    const { el } = render('2026-10-22'); // Thursday
    const days = Array.from(el.querySelectorAll('button.day')).map((b) => b.textContent?.replace(/\s+/g, ' ').trim());
    expect(days).toEqual(['Mon19', 'Tue20', 'Wed21', 'Thu22', 'Fri23']);
    expect(el.querySelector('button.selected')?.textContent).toContain('22');
    expect(el.querySelector('button.selected')?.getAttribute('aria-current')).toBe('date');
  });

  it('shows the previous week for a Sunday and emits the chosen day', () => {
    const { el, changed, buttons } = render('2026-10-25'); // Sunday
    expect(el.querySelector('button.day')?.textContent).toContain('19');
    buttons().find((b) => b.textContent?.includes('21'))!.click();
    expect(changed).toHaveBeenCalledWith('2026-10-21');
  });

  it('moves a week at a time with the arrow buttons', () => {
    const { changed, buttons } = render('2026-10-22');
    buttons().find((b) => b.getAttribute('aria-label') === 'Previous week')!.click();
    buttons().find((b) => b.getAttribute('aria-label') === 'Next week')!.click();
    expect(changed).toHaveBeenNthCalledWith(1, '2026-10-15');
    expect(changed).toHaveBeenNthCalledWith(2, '2026-10-29');
  });
});
