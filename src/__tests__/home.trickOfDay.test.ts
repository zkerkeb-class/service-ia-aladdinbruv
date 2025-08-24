import request from 'supertest';
import app from '../app';

// Mock supabase service used by HomeController
jest.mock('../services/supabase.service', () => {
  const selectMock = jest.fn().mockReturnThis();
  return {
    supabase: {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Kickflip' }], error: null })
    }
  };
});

describe('Home routes - trick of the day', () => {
  it('GET /api/home/trick-of-the-day returns a trick', async () => {
    const res = await request(app).get('/api/home/trick-of-the-day');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(expect.objectContaining({ name: expect.any(String) }));
  });
});


