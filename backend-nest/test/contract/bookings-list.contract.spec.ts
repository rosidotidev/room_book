import request from 'supertest';
import { createTestApp, FIXED_NOW, TestApp } from './app-factory.js';
import { contentTypeFor, validateResponse } from './openapi-loader.js';

describe('GET /api/bookings?organizer= (listBookingsByOrganizer)', () => {
  let testApp: TestApp;
  let earlierId: number;

  beforeAll(async () => {
    testApp = await createTestApp();
    const server = testApp.app.getHttpServer();
    const later = await request(server)
      .post('/api/bookings')
      .send({
        roomId: 3,
        title: 'Late',
        organizer: 'Grace Hopper',
        start: '2026-10-20T16:00:00+02:00',
        end: '2026-10-20T17:00:00+02:00',
      })
      .expect(201);
    const earlier = await request(server)
      .post('/api/bookings')
      .send({
        roomId: 3,
        title: 'Early',
        organizer: 'Grace Hopper',
        start: '2026-10-20T14:00:00+02:00',
        end: '2026-10-20T15:00:00+02:00',
      })
      .expect(201);
    earlierId = earlier.body.id;
    expect(later.body.id).toEqual(expect.any(Number));
  });

  beforeEach(() => {
    testApp.clock.set(FIXED_NOW);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 200 with the organizer bookings as Booking objects, ordered by start time', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/bookings').query({ organizer: 'Grace Hopper' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('listBookingsByOrganizer', 200));
    expect(validateResponse('listBookingsByOrganizer', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.map((booking: { title: string }) => booking.title)).toEqual(['Early', 'Late']);
  });

  it('matches the organizer ignoring letter case and surrounding spaces', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/bookings').query({ organizer: '  gRACE hOPPER ' });

    expect(res.status).toBe(200);
    expect(validateResponse('listBookingsByOrganizer', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toHaveLength(2);
  });

  it('includes cancelled bookings with status CANCELLED', async () => {
    const server = testApp.app.getHttpServer();
    await request(server).delete(`/api/bookings/${earlierId}`).expect(200);

    const res = await request(server).get('/api/bookings').query({ organizer: 'Grace Hopper' });

    expect(res.status).toBe(200);
    expect(validateResponse('listBookingsByOrganizer', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.find((booking: { id: number }) => booking.id === earlierId)).toMatchObject({ status: 'CANCELLED' });
  });

  it('returns 400 problem when the organizer parameter is missing', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/bookings');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('listBookingsByOrganizer', 400));
    expect(validateResponse('listBookingsByOrganizer', 400, res.body)).toEqual({ valid: true, errors: [] });
  });
});
