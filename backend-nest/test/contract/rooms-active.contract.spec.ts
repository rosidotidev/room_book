import request from 'supertest';
import { createTestApp, FIXED_NOW, TestApp } from './app-factory.js';
import { contentTypeFor, validateBody, validateResponse } from './openapi-loader.js';

describe('PATCH /api/rooms/{id}/active (setRoomActive)', () => {
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

  it('returns 200 with the room and an empty futureBookings list when there are no bookings', async () => {
    const payload = { active: false };
    expect(validateBody('ActiveChange', payload)).toEqual({ valid: true, errors: [] });

    const res = await request(testApp.app.getHttpServer()).patch('/api/rooms/1/active').send(payload);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('setRoomActive', 200));
    expect(validateResponse('setRoomActive', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ room: { id: 1, active: false }, futureBookings: [] });
  });

  it('accepts setting the state the room already has', async () => {
    const res = await request(testApp.app.getHttpServer()).patch('/api/rooms/1/active').send({ active: false });

    expect(res.status).toBe(200);
    expect(validateResponse('setRoomActive', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.room).toMatchObject({ id: 1, active: false });
  });

  it('lists future bookings when deactivating a room, and deletes nothing', async () => {
    const server = testApp.app.getHttpServer();
    const created = await request(server)
      .post('/api/bookings')
      .send({
        roomId: 2,
        title: 'Sprint sync',
        organizer: 'Ada Lovelace',
        start: '2026-10-20T12:00:00+02:00',
        end: '2026-10-20T13:00:00+02:00',
      })
      .expect(201);

    const res = await request(server).patch('/api/rooms/2/active').send({ active: false });

    expect(res.status).toBe(200);
    expect(validateResponse('setRoomActive', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.room).toMatchObject({ id: 2, active: false });
    expect(res.body.futureBookings).toHaveLength(1);
    expect(res.body.futureBookings[0]).toMatchObject({ id: created.body.id, organizer: 'Ada Lovelace' });

    const still = await request(server).get('/api/bookings').query({ organizer: 'Ada Lovelace' });
    expect(still.body.map((booking: { id: number }) => booking.id)).toContain(created.body.id);
  });

  it('returns 400 problem for an invalid body', async () => {
    const res = await request(testApp.app.getHttpServer()).patch('/api/rooms/1/active').send({ active: 'yes' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('setRoomActive', 400));
    expect(validateResponse('setRoomActive', 400, res.body)).toEqual({ valid: true, errors: [] });
  });

  it('returns 404 problem "Room not found" for an unknown id', async () => {
    const res = await request(testApp.app.getHttpServer()).patch('/api/rooms/9999/active').send({ active: true });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(contentTypeFor('setRoomActive', 404));
    expect(validateResponse('setRoomActive', 404, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room not found', status: 404 });
  });
});
