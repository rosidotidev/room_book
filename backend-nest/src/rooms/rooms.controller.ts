import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { bindBoolean, bindInteger, bindObject, bindText, bindTextList } from '../common/json-binding.js';
import { ParseIdPipe, optionalWholeNumber } from '../common/parameters.js';
import type { ActiveChange, Room, RoomActivationResult, RoomInput } from './rooms.dto.js';
import { RoomsService } from './rooms.service.js';

/** HTTP mapping only: bind the JSON body, then let RoomsService apply the rules. */
@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get()
  list(@Query('minCapacity') minCapacity?: string, @Query('equipment') equipment?: string): Room[] {
    return this.service.list(optionalWholeNumber(minCapacity, 'minCapacity'), equipment);
  }

  @Post()
  create(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Room {
    const room = this.service.create(bindRoomInput(body));
    response.location(`/api/rooms/${room.id}`);
    return room;
  }

  @Put(':id')
  update(@Param('id', ParseIdPipe) id: number, @Body() body: unknown): Room {
    return this.service.update(id, bindRoomInput(body));
  }

  @Patch(':id/active')
  setActive(@Param('id', ParseIdPipe) id: number, @Body() body: unknown): RoomActivationResult {
    return this.service.setActive(id, bindActiveChange(body));
  }
}

/** Jackson-style binding of a room body: any field of the wrong type is a malformed request. */
function bindRoomInput(body: unknown): RoomInput {
  const raw = bindObject(body);
  return {
    name: bindText(raw.name),
    capacity: bindInteger(raw.capacity),
    equipment: bindTextList(raw.equipment),
  };
}

function bindActiveChange(body: unknown): ActiveChange {
  return { active: bindBoolean(bindObject(body).active) };
}
