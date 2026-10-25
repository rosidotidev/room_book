import request from 'supertest';
import { createTestApp, FIXED_NOW, TestApp } from './app-factory.js';
import { contentTypeFor, validateResponse } from './openapi-loader.js';

// Wednesday 2026-10-21 office time, room 2. Created out of order and with one cancelled booking.
const DAY = '2026-10-21';

describe('GET /api/rooms/{id}/availability?date= (getRoomAvailability)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    const server = testApp.app.getHttpServer();
    const book = async (title: string, start: string, end: string): Promise<number> => {
      const res = await request(server)
        .post('/api/bookings')
        .send({ roomId: 2, title, organizer: 'Ada Lovelace', start, end })
        .expect(201);
      return res.body.id;
    };
    await book('Afternoon', '2026-10-21T15:00:00+02:00', '2026-10-21T16:00:00+02:00');
    await book('Morning', '2026-10-21T09:00:00+02:00', '2026-10-21T10:00:00+02:00');
    const cancelled = await book('Withdrawn', '2026-10-21T11:00:00+02:00', '2026-10-21T12:00:00+02:00');
    await request(server).delete(`/api/bookings/${cancelled}`).expect(200);
  });

  beforeEach(() => {
    testApp.clock.set(FIXED_NOW);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 200 with confirmed bookings only, ordered by start', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms/2/availability').query({ date: DAY });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('getRoomAvailability', 200));
    expect(validateResponse('getRoomAvailability', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.map((booking: { title: string }) => booking.title)).toEqual(['Morning', 'Afternoon']);
    expect(res.body.every((booking: { status: string }) => booking.status === 'CONFIRMED')).toBe(true);
  });

  it('returns 200 with an empty array for a day without bookings', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms/2/availability').query({ date: '2026-10-22' });

    expect(res.status).toBe(200);
    expect(validateResponse('getRoomAvailability', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toEqual([]);
  });

  it('returns 400 problem for a malformed date', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms/2/availability').query({ date: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('getRoomAvailability', 400));
    expect(validateResponse('getRoomAvailability', 400, res.body)).toEqual({ valid: true, errors: [] });
  });

  it('returns 404 problem "Room not found" for an unknown room', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms/999/availability').query({ date: DAY });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(contentTypeFor('getRoomAvailability', 404));
    expect(validateResponse('getRoomAvailability', 404, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room not found', status: 404 });
  });
});
