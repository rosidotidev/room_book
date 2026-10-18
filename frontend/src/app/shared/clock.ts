import { InjectionToken } from '@angular/core';

/** The current moment. Injected so that tests can fix it. */
export const NOW = new InjectionToken<() => Date>('NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
