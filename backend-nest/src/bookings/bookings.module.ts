import { Module } from '@nestjs/common';
import { RoomsRepositoryModule } from '../rooms/rooms-repository.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsRepository } from './bookings.repository.js';
import { BookingsService } from './bookings.service.js';

/** Exports the repository for RoomsModule's deactivation summary. The service stays private. */
@Module({
  imports: [RoomsRepositoryModule],
  controllers: [BookingsController],
  providers: [BookingsRepository, BookingsService],
  exports: [BookingsRepository],
})
export class BookingsModule {}
