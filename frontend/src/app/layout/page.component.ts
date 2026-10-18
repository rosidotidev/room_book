import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page header and spacing shared by every screen. */
@Component({
  selector: 'app-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content select="[page-actions]" /></div>
    </header>
    <ng-content />
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    h1 {
      margin: 0;
      font-size: var(--font-size-display);
    }
    .subtitle {
      margin: var(--space-1) 0 0;
      color: var(--color-ink-muted);
    }
  `,
})
export class PageComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
