import request from 'supertest';
import app from '../app';

// Mock SpotStorageService createSpot
jest.mock('../services/spot-storage.service', () => {
  return {
    SpotStorageService: jest.fn().mockImplementation(() => ({
      createSpot: jest.fn().mockResolvedValue({ id: 'new-spot', name: 'New Spot' })
    }))
  };
});

describe('Spots routes - createSpot', () => {
  it('POST /api/spots requires auth', async () => {
    const res = await request(app)
      .post('/api/spots')
      .send({ name: 'X', latitude: 1, longitude: 2 });
    expect(res.status).toBe(401);
  });

  it('POST /api/spots with mock token succeeds', async () => {
    const res = await request(app)
      .post('/api/spots')
      .set('Authorization', 'Bearer mock-development-token')
      .send({ name: 'My Spot', latitude: 1, longitude: 2 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});


