import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthProbeRepository } from './health-probe.repository.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthProbeRepository, HealthService],
})
export class HealthModule {}
