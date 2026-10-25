import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsRepositoryModule } from './rooms-repository.module.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [BookingsModule, RoomsRepositoryModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
