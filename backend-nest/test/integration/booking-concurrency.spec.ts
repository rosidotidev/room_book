import request from 'supertest';
import { createTestApp, FIXED_NOW, TestApp } from '../contract/app-factory.js';

// Room 4 is not used by any other test in this file. 14:00 CEST on Tuesday 2026-10-20 is 12:00Z.
const ROOM = 4;

describe('overlapping bookings sent at the same time (spec edge case, data-model.md concurrency)', () => {
  let testApp: TestApp;

  beforeEach(async () => {
    testApp = await createTestApp(FIXED_NOW);
  });

  afterEach(async () => {
    await testApp.close();
  });

  it('accepts exactly one of two overlapping requests and stores exactly one confirmed row', async () => {
    const server = testApp.app.getHttpServer();
    const send = (title: string, start: string, end: string) =>
      request(server).post('/api/bookings').send({ roomId: ROOM, title, organizer: 'Ada Lovelace', start, end });

    const [first, second] = await Promise.all([
      send('First', '2026-10-20T14:00:00+02:00', '2026-10-20T15:00:00+02:00'),
      send('Second', '2026-10-20T14:30:00+02:00', '2026-10-20T15:30:00+02:00'),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const loser = first.status === 409 ? first : second;
    expect(loser.body).toMatchObject({ title: 'Slot already booked', status: 409 });

    const rows = testApp.database
      .prepare(
        "SELECT id FROM booking WHERE room_id = ? AND status = 'CONFIRMED' AND start_at >= ? AND start_at < ?",
      )
      .all(ROOM, '2026-10-20T00:00:00Z', '2026-10-21T00:00:00Z');
    expect(rows).toHaveLength(1);
  });
});
