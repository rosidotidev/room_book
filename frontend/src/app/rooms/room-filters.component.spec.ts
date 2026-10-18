import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomFiltersComponent } from './room-filters.component';

describe('RoomFiltersComponent (collapsible panel)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const fixture = TestBed.createComponent(RoomFiltersComponent);
    fixture.componentRef.setInput('equipmentOptions', ['Projector']);
    const emitted = vi.fn();
    fixture.componentInstance.filterChange.subscribe(emitted);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, emitted };
  }

  it('toggles the panel with aria-expanded', () => {
    const { fixture, el } = setup();
    const toggle = el.querySelector('button.toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.panel')?.classList.contains('open')).toBe(false);
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.panel')?.classList.contains('open')).toBe(true);
  });

  it('shows how many filters are active even when collapsed', () => {
    const { fixture, el } = setup();
    fixture.componentInstance.form.controls.minCapacity.setValue(8);
    fixture.componentInstance.form.controls.equipment.setValue('Projector');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect((el.querySelector('button.toggle') as HTMLButtonElement).textContent).toContain('(2)');
  });

  it('clears the filters and reports the empty filter', () => {
    const { fixture, el, emitted } = setup();
    fixture.componentInstance.form.controls.minCapacity.setValue(8);
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    fixture.componentInstance.clear();
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(emitted).toHaveBeenLastCalledWith({ minCapacity: null, equipment: null });
    expect((el.querySelector('button.toggle') as HTMLButtonElement).textContent).not.toContain('(');
  });
});
