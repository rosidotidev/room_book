import { TestBed } from '@angular/core/testing';
import { ProblemMessageComponent } from './problem-message.component';

describe('ProblemMessageComponent', () => {
  it('shows the message with an alert role and an icon', () => {
    const fixture = TestBed.createComponent(ProblemMessageComponent);
    fixture.componentRef.setInput('message', 'A room named "Gamma" already exists.');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('already exists');
    expect(alert?.querySelector('svg')).toBeTruthy();
  });
});
