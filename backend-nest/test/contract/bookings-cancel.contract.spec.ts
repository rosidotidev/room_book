import request from 'supertest';
import { createTestApp, FIXED_NOW, TestApp } from './app-factory.js';
import { contentTypeFor, validateResponse } from './openapi-loader.js';

describe('DELETE /api/bookings/{id} (cancelBooking)', () => {
  let testApp: TestApp;
  // Room 5 (Everest), all on Tuesday 2026-10-20 office time.
  let inOneHourCancel: number; // starts 13:00, cancelled at 12:01 (59 minutes before start)
  let twoHoursAway: number; // starts 14:00, cancelled at 13:00 (60 minutes before start)
  let afternoon: number; // starts 15:00, cancelled at 11:00 then again after the window

  beforeAll(async () => {
    testApp = await createTestApp();
    const server = testApp.app.getHttpServer();
    const book = async (start: string, end: string): Promise<number> => {
      const res = await request(server)
        .post('/api/bookings')
        .send({ roomId: 5, title: 'Cancel me', organizer: 'Linus Torvalds', start, end })
        .expect(201);
      return res.body.id;
    };
    inOneHourCancel = await book('2026-10-20T13:00:00+02:00', '2026-10-20T14:00:00+02:00');
    twoHoursAway = await book('2026-10-20T14:00:00+02:00', '2026-10-20T15:00:00+02:00');
    afternoon = await book('2026-10-20T15:00:00+02:00', '2026-10-20T16:00:00+02:00');
  });

  beforeEach(() => {
    testApp.clock.set(FIXED_NOW);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 200 with the booking status CANCELLED', async () => {
    const res = await request(testApp.app.getHttpServer()).delete(`/api/bookings/${afternoon}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('cancelBooking', 200));
    expect(validateResponse('cancelBooking', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ id: afternoon, status: 'CANCELLED' });
  });

  it('accepts cancelling an already cancelled booking after the window, returning the same booking', async () => {
    testApp.clock.set('2026-10-20T15:00:00Z');

    const res = await request(testApp.app.getHttpServer()).delete(`/api/bookings/${afternoon}`);

    expect(res.status).toBe(200);
    expect(validateResponse('cancelBooking', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ id: afternoon, status: 'CANCELLED' });
  });

  it('returns 404 problem "Booking not found" for an unknown id', async () => {
    const res = await request(testApp.app.getHttpServer()).delete('/api/bookings/9999');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(contentTypeFor('cancelBooking', 404));
    expect(validateResponse('cancelBooking', 404, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Booking not found', status: 404 });
  });

  it('returns 409 problem "Too late to cancel" 59 minutes before the start', async () => {
    testApp.clock.set('2026-10-20T10:01:00Z'); // 12:01 office time; the booking starts at 13:00

    const res = await request(testApp.app.getHttpServer()).delete(`/api/bookings/${inOneHourCancel}`);

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(contentTypeFor('cancelBooking', 409));
    expect(validateResponse('cancelBooking', 409, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Too late to cancel', status: 409 });
  });

  it('returns 200 exactly 60 minutes before the start', async () => {
    testApp.clock.set('2026-10-20T11:00:00Z'); // 13:00 office time; the booking starts at 14:00

    const res = await request(testApp.app.getHttpServer()).delete(`/api/bookings/${twoHoursAway}`);

    expect(res.status).toBe(200);
    expect(validateResponse('cancelBooking', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ id: twoHoursAway, status: 'CANCELLED' });
  });
});
