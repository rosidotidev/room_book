import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { HealthReport, HealthService, HealthStatus } from '../api';
import { HealthStatusComponent } from './health-status.component';

function render(response: Observable<HealthReport>): HTMLElement {
  TestBed.configureTestingModule({
    imports: [HealthStatusComponent],
    providers: [{ provide: HealthService, useValue: { getHealth: () => response } }],
  });
  const fixture = TestBed.createComponent(HealthStatusComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HealthStatusComponent', () => {
  const up: HealthReport = { status: HealthStatus.Up, database: HealthStatus.Up, time: '2026-10-19T09:00:00Z' };

  it('shows backend and database as UP', () => {
    const el = render(of(up));
    expect(el.textContent).toContain('Backend: UP');
    expect(el.textContent).toContain('Database: UP');
  });

  it('shows a database problem when the backend answers 503', () => {
    const down: HealthReport = { ...up, status: HealthStatus.Down, database: HealthStatus.Down };
    const el = render(throwError(() => new HttpErrorResponse({ status: 503, error: down })));
    expect(el.textContent).toContain('Database: DOWN');
  });

  it('shows a readable message when the backend is unreachable', () => {
    const el = render(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(el.textContent).toContain('Backend unreachable');
    expect(el.textContent).toContain('not reachable');
  });
});
