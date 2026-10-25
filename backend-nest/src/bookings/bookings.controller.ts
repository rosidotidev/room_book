import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { bindInstant, bindInteger, bindObject, bindText } from '../common/json-binding.js';
import { ParseIdPipe, conversionFailed, missingParameter } from '../common/parameters.js';
import { BookingsService } from './bookings.service.js';
import type { Booking, BookingInput } from './bookings.dto.js';

/** HTTP mapping only: bind the JSON body and the parameters, then let BookingsService apply the rules. */
@Controller()
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post('api/bookings')
  create(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Booking {
    const booking = this.service.create(bindBookingInput(body));
    response.location(`/api/bookings/${booking.id}`);
    return booking;
  }

  @Get('api/bookings')
  byOrganizer(@Query('organizer') organizer?: string): Booking[] {
    if (organizer === undefined) {
      throw missingParameter('organizer');
    }
    return this.service.byOrganizer(organizer);
  }

  @Delete('api/bookings/:id')
  cancel(@Param('id', ParseIdPipe) id: number): Booking {
    return this.service.cancel(id);
  }

  @Get('api/rooms/:id/availability')
  availability(@Param('id', ParseIdPipe) id: number, @Query('date') date?: string): Booking[] {
    if (date === undefined || date === '') {
      throw missingParameter('date');
    }
    if (!isCalendarDate(date)) {
      throw conversionFailed('date', date);
    }
    return this.service.availability(id, date);
  }
}

/** Jackson-style binding of a booking body: a value of the wrong type is a malformed request, before any rule. */
function bindBookingInput(body: unknown): BookingInput {
  const raw = bindObject(body);
  return {
    roomId: bindInteger(raw.roomId, Number.MAX_SAFE_INTEGER),
    title: bindText(raw.title),
    organizer: bindText(raw.organizer),
    start: bindInstant(raw.start),
    end: bindInstant(raw.end),
  };
}

/** yyyy-MM-dd that names a real calendar day (rejects 2026-02-30). */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}
