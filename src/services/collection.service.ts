import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { Collection, Spot, PaginationOptions, PaginationResult } from '../types';
import logger from '../config/logger';
import { getCache, setCache, deleteCache, clearCachePattern } from '../config/cache';
import { env } from '../config/env';
import { spotStorageService } from './spot-storage.service';

/**
 * Service for managing collections of skateboarding spots
 */
export class CollectionService {
  private readonly collectionTable = 'collections';
  private readonly junctionTable = 'collection_spots';
  private readonly cacheTTL = env.CACHE_TTL;

  /**
   * Create a new collection
   * @param userId User ID who owns the collection
   * @param name Collection name
   * @param description Optional collection description
   * @param icon Optional icon identifier
   * @returns The created collection
   */
  async createCollection(
    userId: string,
    name: string,
    description?: string,
    icon?: string
  ): Promise<Collection> {
    try {
      // Generate collection ID
      const id = uuidv4();
      
      // Insert collection into database
      const { data, error } = await supabase
        .from(this.collectionTable)
        .insert({
          id,
          user_id: userId,
          name,
          description: description || null,
          icon: icon || null,
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Error creating collection:', error.message);
        throw new Error(`Failed to create collection: ${error.message}`);
      }
      
      // Clear user collections cache
      await clearCachePattern(`collections:user:${userId}:*`);
      
      return data as Collection;
    } catch (error) {
      logger.error('Error in createCollection:', error);
      throw error;
    }
  }

  /**
   * Update a collection
   * @param collectionId Collection ID to update
   * @param updates Updates to apply
   * @returns The updated collection
   */
  async updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<Collection> {
    try {
      // Don't allow changing user_id
      const { user_id, ...validUpdates } = updates;
      
      // Add updated timestamp
      const updateData = {
        ...validUpdates,
        updated_at: new Date().toISOString(),
      };
      
      // Update in database
      const { data, error } = await supabase
        .from(this.collectionTable)
        .update(updateData)
        .eq('id', collectionId)
        .select()
        .single();
      
      if (error) {
        logger.error(`Error updating collection ${collectionId}:`, error.message);
        throw new Error(`Failed to update collection: ${error.message}`);
      }
      
      // Clear collection cache
      await deleteCache(`collections:${collectionId}`);
      
      // Clear user collections cache
      if (data.user_id) {
        await clearCachePattern(`collections:user:${data.user_id}:*`);
      }
      
      return data as Collection;
    } catch (error) {
      logger.error(`Error in updateCollection for ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   * @param collectionId Collection ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    try {
      // Get the collection first to know the user_id for cache invalidation
      const collection = await this.getCollectionById(collectionId);
      
      if (!collection) {
        return false;
      }
      
      // Delete the collection (junction table entries will be deleted by CASCADE)
      const { error } = await supabase
        .from(this.collectionTable)
        .delete()
        .eq('id', collectionId);
      
      if (error) {
        logger.error(`Error deleting collection ${collectionId}:`, error.message);
        throw new Error(`Failed to delete collection: ${error.message}`);
      }
      
      // Clear collection cache
      await deleteCache(`collections:${collectionId}`);
      await clearCachePattern(`collections:spots:${collectionId}:*`);
      
      // Clear user collections cache
      await clearCachePattern(`collections:user:${collection.user_id}:*`);
      
      return true;
    } catch (error) {
      logger.error(`Error in deleteCollection for ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Add a spot to a collection
   * @param collectionId Collection ID
   * @param spotId Spot ID to add
   * @returns Promise<void>
   */
  async addSpotToCollection(collectionId: string, spotId: string): Promise<void> {
    try {
      // Check if spot already exists in collection
      const { data: existing, error: checkError } = await supabase
        .from(this.junctionTable)
        .select()
        .eq('collection_id', collectionId)
        .eq('spot_id', spotId)
        .maybeSingle();
      
      if (checkError) {
        logger.error('Error checking if spot is in collection:', checkError.message);
        throw new Error(`Failed to check collection spot: ${checkError.message}`);
      }
      
      // Spot already exists in collection
      if (existing) {
        return;
      }
      
      // Add spot to collection
      const { error } = await supabase
        .from(this.junctionTable)
        .insert({
          collection_id: collectionId,
          spot_id: spotId,
          added_at: new Date().toISOString(),
        });
      
      if (error) {
        logger.error(`Error adding spot ${spotId} to collection ${collectionId}:`, error.message);
        throw new Error(`Failed to add spot to collection: ${error.message}`);
      }
      
      // Clear collection spots cache
      await clearCachePattern(`collections:spots:${collectionId}:*`);
    } catch (error) {
      logger.error(`Error in addSpotToCollection for collection ${collectionId} and spot ${spotId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a spot from a collection
   * @param collectionId Collection ID
   * @param spotId Spot ID to remove
   * @returns Promise<void>
   */
  async removeSpotFromCollection(collectionId: string, spotId: string): Promise<void> {
    try {
      // Remove spot from collection
      const { error } = await supabase
        .from(this.junctionTable)
        .delete()
        .eq('collection_id', collectionId)
        .eq('spot_id', spotId);
      
      if (error) {
        logger.error(`Error removing spot ${spotId} from collection ${collectionId}:`, error.message);
        throw new Error(`Failed to remove spot from collection: ${error.message}`);
      }
      
      // Clear collection spots cache
      await clearCachePattern(`collections:spots:${collectionId}:*`);
    } catch (error) {
      logger.error(`Error in removeSpotFromCollection for collection ${collectionId} and spot ${spotId}:`, error);
      throw error;
    }
  }

  /**
   * Get all collections for a user
   * @param userId The user ID
   * @param options Pagination options
   * @returns User's collections with pagination info
   */
  async getUserCollections(
    userId: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Collection>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;
      
      // Try to get from cache first
      const cacheKey = `collections:user:${userId}:${page}:${limit}`;
      const cachedResult = await getCache<PaginationResult<Collection>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Count total collections for the user
      const { count, error: countError } = await supabase
        .from(this.collectionTable)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) {
        logger.error(`Error counting collections for user ${userId}:`, countError.message);
        throw new Error(`Failed to count collections: ${countError.message}`);
      }
      
      // Get paginated data
      const { data: collections, error } = await supabase
        .from(this.collectionTable)
        .select()
        .eq('user_id', userId)
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);
      
      if (error) {
        logger.error(`Error getting collections for user ${userId}:`, error.message);
        throw new Error(`Failed to get collections: ${error.message}`);
      }
      
      // For each collection, count how many spots it contains
      const collectionsWithCount = await Promise.all(
        collections.map(async (collection) => {
          const { count: spotCount, error: spotCountError } = await supabase
            .from(this.junctionTable)
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id);
          
          if (spotCountError) {
            logger.warn(`Error counting spots for collection ${collection.id}:`, spotCountError.message);
          }
          
          return {
            ...collection,
            spot_count: spotCount || 0,
          };
        })
      );
      
      const total = count || 0;
      const result: PaginationResult<Collection> = {
        data: collectionsWithCount as Collection[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
      
      // Cache for future requests
      await setCache(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error(`Error in getUserCollections for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all spots in a collection
   * @param collectionId The collection ID
   * @param options Pagination options
   * @returns Spots in the collection with pagination info
   */
  async getCollectionSpots(
    collectionId: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Spot>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;
      
      // Try to get from cache first
      const cacheKey = `collections:spots:${collectionId}:${page}:${limit}`;
      const cachedResult = await getCache<PaginationResult<Spot>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Count total spots in the collection
      const { count, error: countError } = await supabase
        .from(this.junctionTable)
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collectionId);
      
      if (countError) {
        logger.error(`Error counting spots in collection ${collectionId}:`, countError.message);
        throw new Error(`Failed to count collection spots: ${countError.message}`);
      }
      
      // Get paginated spot IDs
      const { data: junctionEntries, error } = await supabase
        .from(this.junctionTable)
        .select('spot_id, added_at')
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        logger.error(`Error getting spot IDs from collection ${collectionId}:`, error.message);
        throw new Error(`Failed to get collection spot IDs: ${error.message}`);
      }
      
      // If no spots in collection, return empty result
      if (!junctionEntries.length) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
      
      // Get the actual spot data for each ID
      const spotIds = junctionEntries.map(entry => entry.spot_id);
      const spotPromises = spotIds.map(id => spotStorageService.getSpotById(id));
      const spots = await Promise.all(spotPromises);
      
      // Filter out any null spots (might have been deleted)
      const validSpots = spots.filter((spot): spot is Spot => spot !== null);
      
      const total = count || 0;
      const result: PaginationResult<Spot> = {
        data: validSpots,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
      
      // Cache for future requests
      await setCache(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error(`Error in getCollectionSpots for ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get a collection by ID
   * @param collectionId The collection ID
   * @returns The collection or null if not found
   */
  async getCollectionById(collectionId: string): Promise<Collection | null> {
    try {
      // Try to get from cache first
      const cachedCollection = await getCache<Collection>(`collections:${collectionId}`);
      if (cachedCollection) {
        return cachedCollection;
      }
      
      // Query database
      const { data, error } = await supabase
        .from(this.collectionTable)
        .select()
        .eq('id', collectionId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 indicates no rows returned
          return null;
        }
        logger.error(`Error getting collection ${collectionId}:`, error.message);
        throw new Error(`Failed to get collection: ${error.message}`);
      }
      
      if (!data) {
        return null;
      }
      
      // Get spot count
      const { count: spotCount, error: spotCountError } = await supabase
        .from(this.junctionTable)
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collectionId);
        
      if (spotCountError) {
        logger.warn(`Error counting spots for collection ${collectionId}:`, spotCountError.message);
      }
      
      const collection = {
        ...data,
        spot_count: spotCount || 0,
      } as Collection;
      
      // Cache for future requests
      await setCache(`collections:${collectionId}`, collection, this.cacheTTL);
      
      return collection;
    } catch (error) {
      logger.error(`Error in getCollectionById for ${collectionId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a spot is in a collection
   * @param collectionId Collection ID
   * @param spotId Spot ID
   * @returns True if spot is in collection, false otherwise
   */
  async isSpotInCollection(collectionId: string, spotId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.junctionTable)
        .select()
        .eq('collection_id', collectionId)
        .eq('spot_id', spotId)
        .maybeSingle();
      
      if (error) {
        logger.error(`Error checking if spot ${spotId} is in collection ${collectionId}:`, error.message);
        throw new Error(`Failed to check collection spot: ${error.message}`);
      }
      
      return !!data;
    } catch (error) {
      logger.error(`Error in isSpotInCollection for collection ${collectionId} and spot ${spotId}:`, error);
      throw error;
    }
  }

  async getSpotsInCollection(collectionId: string): Promise<any[]> {
    // Implementation for getting spots in a collection
    return [];
  }

  async getCollectionsByUser(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getAchievementsByUser(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        achievements (*)
      `)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return data.map((ua: any) => ua.achievements);
  }
}

// Export singleton instance
export const collectionService = new CollectionService(); 