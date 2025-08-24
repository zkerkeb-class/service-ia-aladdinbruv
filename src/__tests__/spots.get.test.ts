import request from 'supertest';
import app from '../app';

// Mock SpotStorageService used by SpotController
jest.mock('../services/spot-storage.service', () => {
  return {
    SpotStorageService: jest.fn().mockImplementation(() => ({
      getSpots: jest.fn().mockResolvedValue({ data: [{ id: 's1', name: 'Test Spot' }] })
    }))
  };
});

describe('Spots routes - getSpots', () => {
  it('GET /api/spots returns list', async () => {
    const res = await request(app).get('/api/spots');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});


