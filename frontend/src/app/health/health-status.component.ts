import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HealthReport, HealthService } from '../api';
import { IconComponent } from '../shared/icon.component';
import { problemMessage } from '../shared/problem-message';

type View =
  | { kind: 'loading' }
  | { kind: 'up'; report: HealthReport }
  | { kind: 'database-down'; report: HealthReport }
  | { kind: 'unreachable'; message: string };

/**
 * Compact system indicator (a pill with an icon and a short label), placed in the navigation area of the shell
 * so that it is never mistaken for page content. The full detail is available to assistive technology and as a tooltip.
 */
@Component({
  selector: 'app-health-status',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pill" [class]="'pill pill--' + view().kind" role="status" [attr.title]="detail()">
      <app-icon [name]="icon()" />
      <span class="label" aria-hidden="true">{{ label() }}</span>
      <span class="sr-only">{{ detail() }}</span>
    </div>
  `,
  styles: `
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem var(--space-1);
      border-radius: var(--radius-pill);
      background: var(--color-surface);
      color: var(--color-ink-muted);
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
    }
    .pill--up {
      color: var(--color-success);
    }
    .pill--database-down {
      color: var(--color-warning);
    }
    .pill--unreachable {
      color: var(--color-danger);
    }
    /* Tablet top bar (600-1024 px) has no room for the words: the icon alone is shown, the tooltip and screen readers keep the detail */
    @media (min-width: 600px) and (max-width: 1024px) {
      .label {
        display: none;
      }
      .pill {
        padding: 0.25rem;
      }
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class HealthStatusComponent implements OnInit {
  private readonly healthService = inject(HealthService);

  protected readonly view = signal<View>({ kind: 'loading' });

  protected icon(): 'clock' | 'check' | 'warning' | 'error' {
    switch (this.view().kind) {
      case 'up':
        return 'check';
      case 'database-down':
        return 'warning';
      case 'unreachable':
        return 'error';
      default:
        return 'clock';
    }
  }

  protected label(): string {
    switch (this.view().kind) {
      case 'up':
        return 'System OK';
      case 'database-down':
        return 'Database down';
      case 'unreachable':
        return 'Offline';
      default:
        return 'Checking…';
    }
  }

  /** The full wording, for the tooltip and for screen readers. */
  protected detail(): string {
    const v = this.view();
    switch (v.kind) {
      case 'up':
        return 'System status. Backend: UP · Database: UP';
      case 'database-down':
        return 'System status. Backend: UP · Database: DOWN. The backend answered, but its database cannot be read and written.';
      case 'unreachable':
        return `System status. Backend unreachable. ${v.message}`;
      default:
        return 'System status. Checking…';
    }
  }

  ngOnInit(): void {
    this.healthService.getHealth().subscribe({
      next: (report) => this.view.set({ kind: 'up', report }),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 503 && error.error) {
          this.view.set({ kind: 'database-down', report: error.error as HealthReport });
        } else {
          this.view.set({ kind: 'unreachable', message: problemMessage(error) });
        }
      },
    });
  }
}
