import { HttpErrorResponse } from '@angular/common/http';

/** Turns any failed API call into a short, readable message (problem+json aware). */
export function problemMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // 0 = no answer at all; 502/504 = the dev proxy or a gateway could not reach the backend
    if (error.status === 0 || error.status === 502 || error.status === 504) {
      return 'The server is not reachable. Check that the backend is running and try again.';
    }
    const body = error.error as { detail?: string; title?: string } | null;
    if (body && typeof body === 'object') {
      if (body.detail) {
        return body.detail;
      }
      if (body.title) {
        return body.title;
      }
    }
    return `The request failed (${error.status}).`;
  }
  return 'Something went wrong. Please try again.';
}
