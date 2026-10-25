import request from 'supertest';
import { createTestApp, TestApp } from './app-factory.js';
import { contentTypeFor, validateResponse } from './openapi-loader.js';

describe('GET /api/rooms (listRooms)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 200 with the six demo rooms as Room objects, each with equipment and active', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('listRooms', 200));
    expect(validateResponse('listRooms', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toHaveLength(6);
    expect(res.body.every((room: { equipment: unknown; active: unknown }) => Array.isArray(room.equipment) && typeof room.active === 'boolean')).toBe(true);
  });

  it('includes inactive rooms', async () => {
    const inactive = await createTestApp();
    try {
      await request(inactive.app.getHttpServer()).patch('/api/rooms/6/active').send({ active: false }).expect(200);

      const res = await request(inactive.app.getHttpServer()).get('/api/rooms');

      expect(res.status).toBe(200);
      expect(validateResponse('listRooms', 200, res.body)).toEqual({ valid: true, errors: [] });
      expect(res.body).toHaveLength(6);
      expect(res.body.find((room: { id: number }) => room.id === 6)).toMatchObject({ active: false });
    } finally {
      await inactive.close();
    }
  });

  it('filters by equipment ignoring letter case and surrounding spaces', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms').query({ equipment: '  WHITEBOARD ' });

    expect(res.status).toBe(200);
    expect(validateResponse('listRooms', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.map((room: { id: number }) => room.id)).toEqual([1, 2, 3, 5]);
  });

  it('returns 400 application/problem+json with title "Invalid room" when minCapacity is 0', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/rooms').query({ minCapacity: 0 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('listRooms', 400));
    expect(validateResponse('listRooms', 400, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Invalid room', status: 400 });
  });
});
