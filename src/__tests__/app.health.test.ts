import request from 'supertest';
import app from '../app';

describe('Health endpoint', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ status: 'ok', service: expect.any(String) })
    );
  });
});


