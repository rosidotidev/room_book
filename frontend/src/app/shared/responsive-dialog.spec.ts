import { BreakpointObserver } from '@angular/cdk/layout';
import { describe, expect, it } from 'vitest';
import { DESKTOP_QUERY, PHONE_QUERY, responsiveDialogConfig } from './responsive-dialog';

const observer = (matching: string[]) => ({ isMatched: (q: string) => matching.includes(q) }) as unknown as BreakpointObserver;

describe('responsiveDialogConfig', () => {
  it('is full screen on a phone', () => {
    const config = responsiveDialogConfig(observer([PHONE_QUERY]));
    expect(config).toMatchObject({ width: '100vw', height: '100vh', panelClass: 'full-screen-dialog' });
  });

  it('is a centered dialog on a tablet', () => {
    const config = responsiveDialogConfig(observer([]));
    expect(config.width).toBe('32rem');
    expect(config.position).toBeUndefined();
    expect(config.height).toBeUndefined();
  });

  it('is a right-anchored side panel on a desktop', () => {
    const config = responsiveDialogConfig(observer([DESKTOP_QUERY]));
    expect(config).toMatchObject({ width: '30rem', height: '100vh', position: { right: '0', top: '0' } });
  });
});
