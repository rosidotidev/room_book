import request from 'supertest';
import { createTestApp, TestApp } from './app-factory.js';
import { contentTypeFor, validateBody, validateResponse } from './openapi-loader.js';

describe('POST /api/rooms (createRoom)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 201 with the created Room, active by default, and a Location header', async () => {
    const payload = { name: 'Lumen', capacity: 5, equipment: ['Projector'] };
    expect(validateBody('RoomInput', payload)).toEqual({ valid: true, errors: [] });

    const res = await request(testApp.app.getHttpServer()).post('/api/rooms').send(payload);

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createRoom', 201));
    expect(res.headers.location).toEqual(expect.any(String));
    expect(validateResponse('createRoom', 201, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ name: 'Lumen', capacity: 5, equipment: ['Projector'], active: true });
  });

  it('returns 400 problem whose detail names "name" when the name is missing', async () => {
    const res = await request(testApp.app.getHttpServer()).post('/api/rooms').send({ capacity: 4 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createRoom', 400));
    expect(validateResponse('createRoom', 400, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body.detail).toContain('name');
  });

  it.each([0, 1001])('returns 400 problem with title "Invalid room" for capacity %i', async (capacity) => {
    const res = await request(testApp.app.getHttpServer()).post('/api/rooms').send({ name: 'Oversize', capacity });

    expect(res.status).toBe(400);
    expect(validateResponse('createRoom', 400, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Invalid room', status: 400 });
  });

  it('returns 409 problem "Room name already exists" for a duplicate name differing in case and spaces', async () => {
    const res = await request(testApp.app.getHttpServer()).post('/api/rooms').send({ name: 'aurora ', capacity: 4 });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createRoom', 409));
    expect(validateResponse('createRoom', 409, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room name already exists', status: 409 });
  });
});
