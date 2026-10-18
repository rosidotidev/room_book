import { HttpErrorResponse } from '@angular/common/http';
import { problemMessage } from './problem-message';

describe('problemMessage', () => {
  it('explains an unreachable server', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(problemMessage(error)).toContain('not reachable');
  });

  it('prefers the problem detail', () => {
    const error = new HttpErrorResponse({ status: 404, error: { title: 'Not Found', detail: 'No such room.' } });
    expect(problemMessage(error)).toBe('No such room.');
  });

  it('falls back to the title, then to the status', () => {
    expect(problemMessage(new HttpErrorResponse({ status: 500, error: { title: 'Internal Server Error' } }))).toBe(
      'Internal Server Error',
    );
    expect(problemMessage(new HttpErrorResponse({ status: 500 }))).toBe('The request failed (500).');
  });

  it('explains an unreachable backend behind a gateway or the dev proxy (502, 504)', () => {
    expect(problemMessage(new HttpErrorResponse({ status: 502 }))).toContain('not reachable');
    expect(problemMessage(new HttpErrorResponse({ status: 504 }))).toContain('not reachable');
  });

  it('handles non-HTTP errors', () => {
    expect(problemMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
