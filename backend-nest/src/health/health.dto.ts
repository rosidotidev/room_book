/** Health report as returned by the API (contract health response). No input type: the endpoint has no body. */
export type HealthStatus = 'UP' | 'DOWN';

export interface HealthReport {
  status: HealthStatus;
  database: HealthStatus;
  time: string;
}
