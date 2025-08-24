import { SpotAnalysisService } from '../services/spot-analysis.service';

// Mock external services
jest.mock('../services/supabase.service', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
  },
}));

import { supabase } from '../services/supabase.service';

describe('SpotAnalysisService', () => {
  let spotAnalysisService: SpotAnalysisService;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockGte: jest.Mock;
  let mockLte: jest.Mock;
  let mockOrder: jest.Mock;

  beforeEach(() => {
    spotAnalysisService = new SpotAnalysisService();
    
    mockFrom = supabase.from as jest.Mock;
    mockSelect = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockGte = jest.fn().mockReturnThis();
    mockLte = jest.fn().mockReturnThis();
    mockOrder = jest.fn().mockReturnThis();

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
      order: mockOrder,
    });

    jest.clearAllMocks();
  });

  describe('getSpotPopularity', () => {
    it('calculates popularity based on visits and ratings', async () => {
      const mockVisitData = [
        { spot_id: 'spot1', visit_date: '2024-01-01' },
        { spot_id: 'spot1', visit_date: '2024-01-02' },
        { spot_id: 'spot1', visit_date: '2024-01-03' }
      ];

      const mockRatingData = [
        { spot_id: 'spot1', rating: 5 },
        { spot_id: 'spot1', rating: 4 },
        { spot_id: 'spot1', rating: 5 }
      ];

      mockSelect
        .mockResolvedValueOnce({ data: mockVisitData, error: null })
        .mockResolvedValueOnce({ data: mockRatingData, error: null });

      const result = await spotAnalysisService.getSpotPopularity('spot1');

      expect(result).toEqual({
        spotId: 'spot1',
        visitCount: 3,
        averageRating: 4.67,
        popularityScore: expect.any(Number)
      });

      expect(mockFrom).toHaveBeenCalledWith('spot_visits');
      expect(mockFrom).toHaveBeenCalledWith('spot_ratings');
    });

    it('handles spots with no data', async () => {
      mockSelect
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await spotAnalysisService.getSpotPopularity('spot1');

      expect(result).toEqual({
        spotId: 'spot1',
        visitCount: 0,
        averageRating: 0,
        popularityScore: 0
      });
    });

    it('handles database errors gracefully', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(spotAnalysisService.getSpotPopularity('spot1'))
        .rejects.toThrow('Failed to analyze spot popularity');
    });
  });

  describe('getSpotsByDistance', () => {
    it('finds spots within specified radius', async () => {
      const mockSpots = [
        { id: 'spot1', name: 'Close Spot', latitude: 40.7128, longitude: -74.0060 },
        { id: 'spot2', name: 'Another Spot', latitude: 40.7589, longitude: -73.9851 }
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockSpots,
        error: null
      });

      const result = await spotAnalysisService.getSpotsByDistance(
        40.7128, -74.0060, 5 // 5km radius
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('distance');
      expect(mockFrom).toHaveBeenCalledWith('spots');
    });

    it('calculates distances correctly', async () => {
      const mockSpots = [
        { id: 'spot1', name: 'Same Location', latitude: 40.7128, longitude: -74.0060 },
        { id: 'spot2', name: 'Far Location', latitude: 41.8781, longitude: -87.6298 } // Chicago
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockSpots,
        error: null
      });

      const result = await spotAnalysisService.getSpotsByDistance(
        40.7128, -74.0060, 1000 // 1000km radius
      );

      expect(result[0].distance).toBe(0); // Same location
      expect(result[1].distance).toBeGreaterThan(700); // NYC to Chicago ~790km
    });

    it('filters spots outside radius', async () => {
      const mockSpots = [
        { id: 'spot1', name: 'Close Spot', latitude: 40.7128, longitude: -74.0060 },
        { id: 'spot2', name: 'Far Spot', latitude: 51.5074, longitude: -0.1278 } // London
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockSpots,
        error: null
      });

      const result = await spotAnalysisService.getSpotsByDistance(
        40.7128, -74.0060, 100 // 100km radius
      );

      expect(result).toHaveLength(1); // Only close spot
      expect(result[0].id).toBe('spot1');
    });

    it('sorts spots by distance', async () => {
      const mockSpots = [
        { id: 'spot1', name: 'Far Spot', latitude: 40.8000, longitude: -74.0000 },
        { id: 'spot2', name: 'Close Spot', latitude: 40.7130, longitude: -74.0062 },
        { id: 'spot3', name: 'Medium Spot', latitude: 40.7500, longitude: -74.0300 }
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockSpots,
        error: null
      });

      const result = await spotAnalysisService.getSpotsByDistance(
        40.7128, -74.0060, 50
      );

      // Should be sorted by distance (closest first)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distance).toBeGreaterThanOrEqual(result[i-1].distance);
      }
    });
  });

  describe('getTrendingSpots', () => {
    it('identifies trending spots based on recent activity', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7); // 7 days ago

      const mockTrendingData = [
        { spot_id: 'spot1', count: '15' },
        { spot_id: 'spot2', count: '12' },
        { spot_id: 'spot3', count: '8' }
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockTrendingData,
        error: null
      });

      const result = await spotAnalysisService.getTrendingSpots(7, 10);

      expect(result).toHaveLength(3);
      expect(result[0].spot_id).toBe('spot1'); // Highest count first
      expect(mockGte).toHaveBeenCalled(); // Date filter applied
    });

    it('limits results to specified count', async () => {
      const mockTrendingData = Array.from({ length: 20 }, (_, i) => ({
        spot_id: `spot${i}`,
        count: `${20 - i}`
      }));

      mockSelect.mockResolvedValueOnce({
        data: mockTrendingData,
        error: null
      });

      const result = await spotAnalysisService.getTrendingSpots(7, 5);

      expect(result).toHaveLength(5);
    });

    it('handles no trending spots', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await spotAnalysisService.getTrendingSpots(7, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getSpotStatistics', () => {
    it('generates comprehensive spot statistics', async () => {
      const mockStats = {
        totalVisits: 25,
        uniqueVisitors: 18,
        averageRating: 4.2,
        totalRatings: 12,
        peakVisitDay: 'Saturday',
        lastVisited: '2024-01-15'
      };

      // Mock multiple database calls for different statistics
      mockSelect
        .mockResolvedValueOnce({ data: Array(25).fill({}), error: null }) // visits
        .mockResolvedValueOnce({ data: Array(18).fill({}), error: null }) // unique visitors
        .mockResolvedValueOnce({ data: [{ avg: 4.2 }], error: null }) // avg rating
        .mockResolvedValueOnce({ data: Array(12).fill({}), error: null }); // total ratings

      const result = await spotAnalysisService.getSpotStatistics('spot1');

      expect(result).toEqual(expect.objectContaining({
        spotId: 'spot1',
        totalVisits: expect.any(Number),
        uniqueVisitors: expect.any(Number),
        averageRating: expect.any(Number)
      }));
    });

    it('handles spots with no statistics', async () => {
      mockSelect
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await spotAnalysisService.getSpotStatistics('spot1');

      expect(result.totalVisits).toBe(156);
      expect(result.uniqueVisitors).toBe(89);
      expect(result.averageRating).toBe(4.2);
    });
  });
});
