import request from 'supertest';
import { createTestApp, TestApp } from './app-factory.js';
import { contentTypeFor, validateProblem, validateResponse } from './openapi-loader.js';

const PROBLEM_CONTENT_TYPE = 'application/problem+json';

describe('error envelope (US4, constitution VI)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 404 application/problem+json for an unknown path', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(PROBLEM_CONTENT_TYPE);
    expect(validateProblem(res.body)).toEqual({ valid: true, errors: [] });
  });

  it('returns 400 problem for a malformed JSON body', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/rooms')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('createRoom', 400));
    expect(validateResponse('createRoom', 400, res.body)).toEqual({ valid: true, errors: [] });
  });

  it('returns 400 problem for a non-numeric path id', async () => {
    const res = await request(testApp.app.getHttpServer())
      .put('/api/rooms/abc')
      .send({ name: 'Anything', capacity: 2 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(contentTypeFor('updateRoom', 400));
    expect(validateResponse('updateRoom', 400, res.body)).toEqual({ valid: true, errors: [] });
  });

  it('returns 500 problem with a generic detail and no stack trace or SQL when the database fails', async () => {
    const broken = await createTestApp();
    try {
      broken.database.close();

      const res = await request(broken.app.getHttpServer()).get('/api/rooms');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(PROBLEM_CONTENT_TYPE);
      expect(validateProblem(res.body)).toEqual({ valid: true, errors: [] });
      expect(res.body).toMatchObject({ title: 'Internal Server Error', status: 500 });
      expect(res.body.detail).not.toMatch(/SQLITE|SELECT|INSERT|UPDATE|DELETE/i);
      expect(res.text).not.toMatch(/\n\s+at /);
    } finally {
      await broken.close();
    }
  });
});
