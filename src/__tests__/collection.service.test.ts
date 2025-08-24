import { CollectionService } from '../services/collection.service';

// Mock Supabase service
jest.mock('../services/supabase.service', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

import { supabase } from '../services/supabase.service';

describe('CollectionService', () => {
  let collectionService: CollectionService;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  beforeEach(() => {
    collectionService = new CollectionService();
    
    mockFrom = supabase.from as jest.Mock;
    mockSelect = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockReturnThis();
    mockDelete = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockSingle = jest.fn();

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
    });

    jest.clearAllMocks();
  });

  describe('getUserCollections', () => {
    it('fetches user collections successfully', async () => {
      const mockCollections = [
        { id: 1, name: 'Favorite Spots', user_id: 'user123' },
        { id: 2, name: 'Street Spots', user_id: 'user123' }
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockCollections,
        error: null
      });

      const result = await collectionService.getUserCollections('user123');

      expect(result).toEqual(mockCollections);
      expect(mockFrom).toHaveBeenCalledWith('collections');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user123');
    });

    it('handles database errors', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(collectionService.getUserCollections('user123'))
        .rejects.toThrow('Failed to fetch collections');
    });

    it('returns empty array when no collections found', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await collectionService.getUserCollections('user123');
      expect(result).toEqual([]);
    });
  });

  describe('createCollection', () => {
    it('creates new collection successfully', async () => {
      const newCollection = {
        id: 3,
        name: 'New Collection',
        user_id: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockInsert.mockResolvedValueOnce({
        data: [newCollection],
        error: null
      });

      const result = await collectionService.createCollection({
        name: 'New Collection',
        user_id: 'user123'
      });

      expect(result).toEqual(newCollection);
      expect(mockFrom).toHaveBeenCalledWith('collections');
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'New Collection',
        user_id: 'user123'
      });
      expect(mockSingle).toHaveBeenCalled();
    });

    it('handles creation errors', async () => {
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Duplicate collection name' }
      });

      await expect(collectionService.createCollection({
        name: 'Duplicate Name',
        user_id: 'user123'
      })).rejects.toThrow('Failed to create collection');
    });

    it('validates required fields', async () => {
      await expect(collectionService.createCollection({
        name: '',
        user_id: 'user123'
      })).rejects.toThrow('Collection name is required');

      await expect(collectionService.createCollection({
        name: 'Valid Name',
        user_id: ''
      })).rejects.toThrow('User ID is required');
    });
  });

  describe('addSpotToCollection', () => {
    it('adds spot to collection successfully', async () => {
      const collectionSpot = {
        id: 1,
        collection_id: 1,
        spot_id: 'spot123',
        added_at: '2024-01-01T00:00:00Z'
      };

      mockInsert.mockResolvedValueOnce({
        data: [collectionSpot],
        error: null
      });

      const result = await collectionService.addSpotToCollection(1, 'spot123');

      expect(result).toEqual(collectionSpot);
      expect(mockFrom).toHaveBeenCalledWith('collection_spots');
      expect(mockInsert).toHaveBeenCalledWith({
        collection_id: 1,
        spot_id: 'spot123'
      });
    });

    it('handles duplicate spot in collection', async () => {
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' }
      });

      await expect(collectionService.addSpotToCollection(1, 'spot123'))
        .rejects.toThrow('Spot already in collection');
    });
  });

  describe('removeSpotFromCollection', () => {
    it('removes spot from collection successfully', async () => {
      mockDelete.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await collectionService.removeSpotFromCollection(1, 'spot123');

      expect(mockFrom).toHaveBeenCalledWith('collection_spots');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('collection_id', 1);
      expect(mockEq).toHaveBeenCalledWith('spot_id', 'spot123');
    });

    it('handles removal errors', async () => {
      mockDelete.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied' }
      });

      await expect(collectionService.removeSpotFromCollection(1, 'spot123'))
        .rejects.toThrow('Failed to remove spot from collection');
    });
  });

  describe('getCollectionSpots', () => {
    it('fetches collection spots with details', async () => {
      const mockSpotsData = [
        {
          spot_id: 'spot1',
          spots: { name: 'Downtown Skate Park', latitude: 40.7128, longitude: -74.0060 }
        },
        {
          spot_id: 'spot2', 
          spots: { name: 'Street Rails', latitude: 40.7589, longitude: -73.9851 }
        }
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockSpotsData,
        error: null
      });

      const result = await collectionService.getCollectionSpots(1);

      expect(result).toEqual(mockSpotsData);
      expect(mockFrom).toHaveBeenCalledWith('collection_spots');
      expect(mockSelect).toHaveBeenCalledWith('spot_id, spots(*)');
      expect(mockEq).toHaveBeenCalledWith('collection_id', 1);
    });

    it('returns empty array for collection with no spots', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await collectionService.getCollectionSpots(1);
      expect(result).toEqual([]);
    });
  });
});
