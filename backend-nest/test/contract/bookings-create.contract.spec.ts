import request from 'supertest';
import { createTestApp, FIXED_NOW, TestApp } from './app-factory.js';
import { contentTypeFor, validateBody, validateResponse } from './openapi-loader.js';

const TUESDAY_14_15 = { start: '2026-10-20T14:00:00+02:00', end: '2026-10-20T15:00:00+02:00' };

describe('POST /api/bookings (createBooking)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(() => {
    testApp.clock.set(FIXED_NOW);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 201 with the Booking, times kept with the office offset', async () => {
    const payload = { roomId: 1, title: 'Design review', organizer: 'Ada Lovelace', ...TUESDAY_14_15 };
    expect(validateBody('BookingInput', payload)).toEqual({ valid: true, errors: [] });

    const res = await request(testApp.app.getHttpServer()).post('/api/bookings').send(payload);

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createBooking', 201));
    expect(res.headers.location).toEqual(expect.any(String));
    expect(validateResponse('createBooking', 201, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({
      roomId: 1,
      title: 'Design review',
      organizer: 'Ada Lovelace',
      status: 'CONFIRMED',
      start: '2026-10-20T14:00:00+02:00',
      end: '2026-10-20T15:00:00+02:00',
    });
  });

  it('returns 400 problem whose detail names the missing field', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/bookings')
      .send({ roomId: 1, organizer: 'Ada Lovelace', ...TUESDAY_14_15 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createBooking', 400));
    expect(validateResponse('createBooking', 400, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.detail).toContain('title');
  });

  it('returns 400 "Booking not allowed" for a Saturday booking', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/bookings')
      .send({
        roomId: 1,
        title: 'Weekend',
        organizer: 'Ada Lovelace',
        start: '2026-10-24T10:00:00+02:00',
        end: '2026-10-24T11:00:00+02:00',
      });

    expect(res.status).toBe(400);
    expect(validateResponse('createBooking', 400, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Booking not allowed', status: 400 });
  });

  it('returns 404 problem "Room not found" for an unknown room', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/bookings')
      .send({ roomId: 999, title: 'Nowhere', organizer: 'Ada Lovelace', ...TUESDAY_14_15 });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createBooking', 404));
    expect(validateResponse('createBooking', 404, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room not found', status: 404 });
  });

  it('returns 422 problem "Room not available" for a deactivated room', async () => {
    const server = testApp.app.getHttpServer();
    await request(server).patch('/api/rooms/6/active').send({ active: false }).expect(200);

    const res = await request(server)
      .post('/api/bookings')
      .send({ roomId: 6, title: 'Offline', organizer: 'Ada Lovelace', ...TUESDAY_14_15 });

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createBooking', 422));
    expect(validateResponse('createBooking', 422, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room not available', status: 422 });
  });

  it('returns 409 problem "Slot already booked" for an overlapping slot', async () => {
    // Own app and database: the setup booking must not be visible to the 201 test above.
    const fresh = await createTestApp();
    try {
      const server = fresh.app.getHttpServer();
      await request(server)
        .post('/api/bookings')
        .send({ roomId: 1, title: 'First', organizer: 'Ada Lovelace', ...TUESDAY_14_15 })
        .expect(201);

      const res = await request(server)
        .post('/api/bookings')
        .send({
          roomId: 1,
          title: 'Overlap',
          organizer: 'Grace Hopper',
          start: '2026-10-20T14:30:00+02:00',
          end: '2026-10-20T15:30:00+02:00',
        });

      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toMatch(contentTypeFor('createBooking', 409));
      expect(validateResponse('createBooking', 409, res.body)).toEqual({ valid: true, errors: [] });
      expect(res.body).toMatchObject({ title: 'Slot already booked', status: 409 });
    } finally {
      await fresh.close();
    }
  });

  it('returns 201 for a back-to-back slot that starts when the previous one ends', async () => {
    const server = testApp.app.getHttpServer();

    const res = await request(server)
      .post('/api/bookings')
      .send({
        roomId: 1,
        title: 'Next',
        organizer: 'Grace Hopper',
        start: '2026-10-20T15:00:00+02:00',
        end: '2026-10-20T16:00:00+02:00',
      });

    expect(res.status).toBe(201);
    expect(validateResponse('createBooking', 201, res.body)).toEqual({ valid: true, errors: [] });
  });
});
