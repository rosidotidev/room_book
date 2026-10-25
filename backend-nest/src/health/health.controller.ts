import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { HealthReport } from './health.dto.js';
import { HealthService } from './health.service.js';

@Controller('api/health')
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  health(@Res({ passthrough: true }) response: Response): HealthReport {
    const report = this.service.check();
    response.status(report.status === 'UP' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
