import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { APP_OPTIONS, configureApplication } from './app-setup.js';
import { AppModule } from './app.module.js';
import { createClock } from './config/clock.provider.js';
import { AppConfig, loadConfig } from './config/config.js';
import { openDatabase } from './db/database.provider.js';
import { runMigrations } from './db/migration-runner.js';

async function bootstrap(): Promise<void> {
  // Startup gate: the service listens only after the database copy has been accepted.
  let config: AppConfig;
  let clock: ReturnType<typeof createClock>;
  let db: ReturnType<typeof openDatabase>;
  try {
    config = loadConfig();
    clock = createClock(config);
    db = openDatabase(config.dbPath);
    runMigrations(db, { clock });
  } catch (error) {
    process.stderr.write(`RoomBook backend refused to start: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule.register({ config, clock, db }), {
    ...APP_OPTIONS,
    logger: ['error', 'warn', 'log'],
  });
  configureApplication(app);
  await app.listen(config.port);
  new Logger('Bootstrap').log(`RoomBook backend listening on http://localhost:${config.port} (db: ${config.dbPath})`);
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(`RoomBook backend failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exit(1);
});
