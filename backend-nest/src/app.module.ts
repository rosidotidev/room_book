import { DynamicModule, Module } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { CLOCK, Clock } from './config/clock.provider.js';
import { AppConfig, CONFIG } from './config/config.js';
import { DATABASE } from './db/database.provider.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { HealthModule } from './health/health.module.js';
import { RoomsModule } from './rooms/rooms.module.js';

export interface AppDependencies {
  config: AppConfig;
  clock: Clock;
  db: Database.Database;
}

/**
 * Root module. Configuration, clock and database are supplied by the bootstrap,
 * after the startup gate has accepted the database, and are global for feature modules.
 */
@Module({})
export class AppModule {
  static register(deps: AppDependencies): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [HealthModule, RoomsModule, BookingsModule],
      providers: [
        { provide: CONFIG, useValue: deps.config },
        { provide: CLOCK, useValue: deps.clock },
        { provide: DATABASE, useValue: deps.db },
      ],
      exports: [CONFIG, CLOCK, DATABASE],
    };
  }
}
