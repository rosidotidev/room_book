import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialogConfig } from '@angular/material/dialog';

export const PHONE_QUERY = '(max-width: 599.98px)';
export const DESKTOP_QUERY = '(min-width: 1024.02px)';

/** Full screen on phones, a right-anchored side panel on desktops, a centered dialog in between. */
export function responsiveDialogConfig(breakpoints: BreakpointObserver): MatDialogConfig {
  if (breakpoints.isMatched(PHONE_QUERY)) {
    return { width: '100vw', maxWidth: '100vw', height: '100vh', panelClass: 'full-screen-dialog' };
  }
  if (breakpoints.isMatched(DESKTOP_QUERY)) {
    return { width: '30rem', maxWidth: '95vw', height: '100vh', position: { right: '0', top: '0' } };
  }
  return { width: '32rem', maxWidth: '95vw' };
}
