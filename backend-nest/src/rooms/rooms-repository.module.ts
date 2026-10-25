import { Module } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository.js';

/**
 * Exposes the room repository without importing RoomsModule, so BookingsModule can look up rooms
 * while RoomsModule imports BookingsModule. This keeps the module graph free of cycles.
 */
@Module({
  providers: [RoomsRepository],
  exports: [RoomsRepository],
})
export class RoomsRepositoryModule {}
