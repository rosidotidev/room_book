import request from 'supertest';
import { createTestApp, TestApp } from './app-factory.js';
import { contentTypeFor, validateResponse } from './openapi-loader.js';

describe('GET /api/health (getHealth)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('returns 200 with status and database UP and a time, as application/json', async () => {
    const res = await request(testApp.app.getHttpServer()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(contentTypeFor('getHealth', 200));
    expect(validateResponse('getHealth', 200, res.body)).toEqual({ valid: true, errors: [] });
    expect(res.body).toMatchObject({ status: 'UP', database: 'UP' });
    expect(res.body.time).toEqual(expect.any(String));
  });

  it('returns 503 with status and database DOWN when the probe table is dropped', async () => {
    const broken = await createTestApp();
    try {
      broken.database.exec('DROP TABLE health_probe');

      const res = await request(broken.app.getHttpServer()).get('/api/health');

      expect(res.status).toBe(503);
      expect(res.headers['content-type']).toMatch(contentTypeFor('getHealth', 503));
      expect(validateResponse('getHealth', 503, res.body)).toEqual({ valid: true, errors: [] });
      expect(res.body).toMatchObject({ status: 'DOWN', database: 'DOWN' });
    } finally {
      await broken.close();
    }
  });
});
