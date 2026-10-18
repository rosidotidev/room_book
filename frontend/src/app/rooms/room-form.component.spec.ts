import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Room } from '../api';
import { RoomFormComponent } from './room-form.component';
import { RoomsFacade } from './rooms.facade';

const SAVED: Room = { id: 7, name: 'Gamma', capacity: 5, equipment: [], active: true };

function setup(facade: Partial<Record<'create' | 'update', unknown>>, room: Room | null = null) {
  TestBed.configureTestingModule({
    imports: [RoomFormComponent],
    providers: [{ provide: RoomsFacade, useValue: facade }],
  });
  const fixture = TestBed.createComponent(RoomFormComponent);
  fixture.componentRef.setInput('room', room);
  const saved = vi.fn();
  fixture.componentInstance.saved.subscribe(saved);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const form = fixture.componentInstance.form;
  const submit = () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  return { fixture, el, form, submit, saved };
}

describe('RoomFormComponent validation', () => {
  it('blocks saving an empty form and explains what to fix next to the fields', () => {
    const create = vi.fn();
    const { el, submit } = setup({ create });
    submit();
    expect(create).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Enter a name for the room.');
    expect(el.textContent).toContain('Enter a whole number from 1 to 1000.');
  });

  it('rejects a capacity below one, above the maximum, or not whole', () => {
    const create = vi.fn();
    const { form, el, submit, fixture } = setup({ create });
    form.controls.name.setValue('Gamma');
    for (const bad of [0, -2, 1001, 2.5]) {
      form.controls.capacity.setValue(bad);
      submit();
      expect(create).not.toHaveBeenCalled();
      expect(form.controls.capacity.invalid).toBe(true);
    }
    expect(el.textContent).toContain('whole number from 1 to 1000');
    expect(fixture.componentInstance.form.valid).toBe(false);
  });

  it('rejects a name that is blank or longer than 100 characters', () => {
    const create = vi.fn();
    const { form, submit } = setup({ create });
    form.controls.capacity.setValue(4);
    form.controls.name.setValue('   ');
    submit();
    expect(form.controls.name.hasError('required')).toBe(true);
    form.controls.name.setValue('n'.repeat(101));
    submit();
    expect(form.controls.name.hasError('maxlength')).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it('saves valid data trimmed and reports the saved room', () => {
    const create = vi.fn(() => of(SAVED));
    const { form, submit, saved } = setup({ create });
    form.controls.name.setValue('  Gamma ');
    form.controls.capacity.setValue(5);
    submit();
    expect(create).toHaveBeenCalledWith({ name: 'Gamma', capacity: 5, equipment: [] });
    expect(saved).toHaveBeenCalledWith(SAVED);
  });

  it('shows a duplicate-name rejection next to the name field and keeps the data', () => {
    const detail = "A room named 'gamma' already exists.";
    const create = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Room name already exists', detail } })));
    const { form, el, submit, saved } = setup({ create });
    form.controls.name.setValue('Gamma');
    form.controls.capacity.setValue(5);
    submit();
    expect(el.textContent).toContain(detail);
    expect(form.controls.name.hasError('server')).toBe(true);
    expect(form.controls.name.value).toBe('Gamma');
    expect(form.controls.capacity.value).toBe(5);
    expect(saved).not.toHaveBeenCalled();
  });

  it('shows a form-level message and keeps the data when the system is unreachable', () => {
    const create = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    const { form, el, submit } = setup({ create });
    form.controls.name.setValue('Gamma');
    form.controls.capacity.setValue(5);
    submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('not reachable');
    expect(form.controls.name.value).toBe('Gamma');
  });

  it('edits an existing room: prefilled fields and update call', () => {
    const update = vi.fn(() => of(SAVED));
    const { form, submit } = setup({ update }, { id: 3, name: 'Old', capacity: 4, equipment: ['Projector'], active: true });
    expect(form.controls.name.value).toBe('Old');
    expect(form.controls.capacity.value).toBe(4);
    form.controls.capacity.setValue(9);
    submit();
    expect(update).toHaveBeenCalledWith(3, { name: 'Old', capacity: 9, equipment: ['Projector'] });
  });

  describe('equipment items', () => {
    const chip = (value: string) => ({ value, chipInput: { clear: vi.fn() } }) as never;
    const items = (component: object) => (component as { equipment: () => string[] }).equipment();
    const add = (component: object, value: string) =>
      (component as { addItem: (e: never) => void }).addItem(chip(value));

    it('trims items and ignores case-insensitive duplicates', () => {
      const { fixture } = setup({ create: vi.fn() });
      const c = fixture.componentInstance;
      add(c, '  Projector ');
      add(c, 'projector');
      add(c, 'Whiteboard');
      expect(items(c)).toEqual(['Projector', 'Whiteboard']);
    });

    it('removes an item', () => {
      const { fixture } = setup({ create: vi.fn() }, { id: 1, name: 'A', capacity: 2, equipment: ['Projector', 'Whiteboard'], active: true });
      (fixture.componentInstance as unknown as { removeItem: (i: string) => void }).removeItem('Projector');
      expect(items(fixture.componentInstance)).toEqual(['Whiteboard']);
    });

    it('refuses an item over 50 characters and a 21st item, with a message', () => {
      const { fixture, el } = setup({ create: vi.fn() });
      const c = fixture.componentInstance;
      add(c, 'x'.repeat(51));
      fixture.detectChanges();
      expect(items(c)).toEqual([]);
      expect(el.textContent).toContain('at most 50 characters');

      for (let i = 0; i < 20; i++) {
        add(c, 'item' + i);
      }
      add(c, 'one more');
      fixture.detectChanges();
      expect(items(c).length).toBe(20);
      expect(el.textContent).toContain('at most 20 equipment items');
    });

    it('sends the items on save', () => {
      const create = vi.fn(() => of(SAVED));
      const { fixture, form, submit } = setup({ create });
      form.controls.name.setValue('Gamma');
      form.controls.capacity.setValue(5);
      add(fixture.componentInstance, 'Projector');
      submit();
      expect(create).toHaveBeenCalledWith({ name: 'Gamma', capacity: 5, equipment: ['Projector'] });
    });
  });
});
