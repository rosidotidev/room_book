import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Inline SVG icons (Material Symbols outlines), so state never depends on color alone and no icon font is fetched. */
const PATHS: Record<string, string> = {
  rooms: 'M3 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16h5v-2h-3V8h-2V5h2a2 2 0 0 1 2 2v12h2v2H3Zm2-2h9V5H5v14Zm6-6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  admin: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5L19.4 13ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z',
  edit: 'm3 17.25 9.8-9.8 3.75 3.75-9.8 9.8H3v-3.75ZM17.7 9.05l-3.75-3.75 1.5-1.5a1 1 0 0 1 1.4 0l2.35 2.35a1 1 0 0 1 0 1.4l-1.5 1.5Z',
  pause: 'M6 19h4V5H6v14Zm8-14v14h4V5h-4Z',
  play: 'M8 5v14l11-7L8 5Z',
  warning: 'M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z',
  error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z',
  filter: 'M10 18h4v-2h-4v2ZM3 6v2h18V6H3Zm3 7h12v-2H6v2Z',
  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z',
  lock: 'M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9V6Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3Z',
  chevronLeft: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12l4.6-4.6Z',
  chevronRight: 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6Z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4Z',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" fill="currentColor" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    svg {
      width: 1.25em;
      height: 1.25em;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<keyof typeof PATHS>();
  protected readonly path = computed(() => PATHS[this.name()]);
}
