import request from 'supertest';
import { createTestApp, TestApp } from './app-factory.js';
import { contentTypeFor, validateBody, validateResponse } from './openapi-loader.js';

describe('PUT /api/rooms/{id} (updateRoom)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 200 with the updated Room', async () => {
    const payload = { name: 'Cirrus Two', capacity: 9, equipment: ['Whiteboard'] };
    expect(validateBody('RoomInput', payload)).toEqual({ valid: true, errors: [] });

    const res = await request(testApp.app.getHttpServer()).put('/api/rooms/3').send(payload);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('updateRoom', 200));
    expect(validateResponse('updateRoom', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ id: 3, name: 'Cirrus Two', capacity: 9 });
  });

  it('returns 400 problem for an invalid body (capacity 0)', async () => {
    const res = await request(testApp.app.getHttpServer()).put('/api/rooms/4').send({ name: 'Delta', capacity: 0 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('updateRoom', 400));
    expect(validateResponse('updateRoom', 400, res.body)).toEqual({ valid: true, errors: [] });
  });

  it('returns 404 problem "Room not found" for an unknown id', async () => {
    const res = await request(testApp.app.getHttpServer()).put('/api/rooms/9999').send({ name: 'Ghost', capacity: 2 });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(contentTypeFor('updateRoom', 404));
    expect(validateResponse('updateRoom', 404, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room not found', status: 404 });
  });

  it('returns 409 problem when renamed to another room\'s name in a different case', async () => {
    const res = await request(testApp.app.getHttpServer()).put('/api/rooms/2').send({ name: 'AURORA', capacity: 6 });

    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toMatch(contentTypeFor('updateRoom', 409));
    expect(validateResponse('updateRoom', 409, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ title: 'Room name already exists', status: 409 });
  });
});
