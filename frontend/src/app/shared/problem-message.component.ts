import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

/** Shared display for a readable error (typically from a problem+json response): icon, text and role alert. */
@Component({
  selector: 'app-problem-message',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="problem" role="alert">
      <app-icon name="error" />
      <span class="text">{{ message() }}</span>
    </div>
  `,
  styles: `
    .problem {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-md);
      background: var(--color-danger-soft);
      color: var(--color-danger);
      font-weight: var(--font-weight-medium);
    }
    .text {
      overflow-wrap: anywhere;
    }
  `,
})
export class ProblemMessageComponent {
  readonly message = input.required<string>();
}
