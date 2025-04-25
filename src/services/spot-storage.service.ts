import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { cacheManager } from '../config/cache';
import logger from '../config/logger';
import { 
  Spot, 
  SpotType, 
  SurfaceType, 
  SpotFeatures, 
  GeoLocation,
  DifficultyRating,
  PaginatedResult,
  SpotStatus
} from '../types';

/**
 * Service for managing skateboarding spots in the database
 */
export class SpotStorageService {
  private cacheTTL = 60 * 60; // 1 hour in seconds
  
  /**
   * Create a new spot in the database
   * @param spot Spot data to create
   * @returns Created spot with ID
   */
  async createSpot(spot: Omit<Spot, 'id' | 'created_at' | 'updated_at'>): Promise<Spot> {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Prepare spot object with defaults
      const newSpot: Spot = {
        id,
        ...spot,
        created_at: timestamp,
        updated_at: timestamp,
        status: spot.status || 'active' as SpotStatus,
        verified: spot.verified || false,
        skateability_score: spot.skateability_score || 5
      };
      
      // Convert GeoLocation to PostGIS format if present
      let geoData = {};
      if (spot.location) {
        geoData = {
          location: `POINT(${spot.location.longitude} ${spot.location.latitude})`,
          latitude: spot.location.latitude,
          longitude: spot.location.longitude
        };
      }
      
      // Insert into database
      const { data, error } = await supabase
        .from('spots')
        .insert([{
          ...newSpot,
          ...geoData,
          features: spot.features || {}
        }])
        .select()
        .single();
      
      if (error) {
        logger.error('Error creating spot:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Invalidate cache for spots
      await this.invalidateSpotCaches();
      
      return this.formatSpotData(data);
    } catch (error) {
      logger.error('Error creating spot:', error);
      throw new Error('Failed to create spot');
    }
  }
  
  /**
   * Update an existing spot in the database
   * @param id Spot ID to update
   * @param spot Updated spot data
   * @returns Updated spot
   */
  async updateSpot(id: string, spot: Partial<Spot>): Promise<Spot> {
    try {
      // Check if spot exists
      const existingSpot = await this.getSpotById(id);
      if (!existingSpot) {
        throw new Error('Spot not found');
      }
      
      // Prevent updating certain fields
      const { id: _, created_at, ...updateData } = spot;
      
      // Update timestamp
      const updatedData = {
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      // Convert GeoLocation to PostGIS format if present
      let geoData = {};
      if (spot.location) {
        geoData = {
          location: `POINT(${spot.location.longitude} ${spot.location.latitude})`,
          latitude: spot.location.latitude,
          longitude: spot.location.longitude
        };
      }
      
      // Update in database
      const { data, error } = await supabase
        .from('spots')
        .update({
          ...updatedData,
          ...geoData
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating spot:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Invalidate caches
      await cacheManager.del(`spot:${id}`);
      await this.invalidateSpotCaches();
      
      return this.formatSpotData(data);
    } catch (error) {
      logger.error('Error updating spot:', error);
      throw new Error(`Failed to update spot: ${error.message}`);
    }
  }
  
  /**
   * Delete a spot from the database
   * @param id Spot ID to delete
   * @returns Success status
   */
  async deleteSpot(id: string): Promise<boolean> {
    try {
      // Check if spot exists
      const existingSpot = await this.getSpotById(id);
      if (!existingSpot) {
        throw new Error('Spot not found');
      }
      
      // Delete from database
      const { error } = await supabase
        .from('spots')
        .delete()
        .eq('id', id);
      
      if (error) {
        logger.error('Error deleting spot:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Invalidate caches
      await cacheManager.del(`spot:${id}`);
      await this.invalidateSpotCaches();
      
      return true;
    } catch (error) {
      logger.error('Error deleting spot:', error);
      throw new Error(`Failed to delete spot: ${error.message}`);
    }
  }
  
  /**
   * Get a spot by its ID
   * @param id Spot ID to retrieve
   * @returns Spot data or null if not found
   */
  async getSpotById(id: string): Promise<Spot | null> {
    try {
      // Check cache first
      const cachedSpot = await cacheManager.get<Spot>(`spot:${id}`);
      if (cachedSpot) {
        return cachedSpot;
      }
      
      // Fetch from database
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found error
          return null;
        }
        logger.error('Error getting spot by ID:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        return null;
      }
      
      const formatted = this.formatSpotData(data);
      
      // Cache result
      await cacheManager.set(`spot:${id}`, formatted, this.cacheTTL);
      
      return formatted;
    } catch (error) {
      logger.error('Error getting spot by ID:', error);
      throw new Error(`Failed to get spot: ${error.message}`);
    }
  }
  
  /**
   * Get spots with filtering, sorting, and pagination
   * @param options Query options
   * @returns Paginated list of spots
   */
  async getSpots(options: {
    page?: number;
    limit?: number;
    type?: SpotType;
    surface?: SurfaceType;
    difficulty?: DifficultyRating;
    verified?: boolean;
    userId?: string;
    search?: string;
    status?: SpotStatus;
    nearLocation?: GeoLocation;
    radius?: number; // in kilometers
    minSkateabilityScore?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResult<Spot>> {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        surface,
        difficulty,
        verified,
        userId,
        search,
        status = 'active',
        nearLocation,
        radius = 10,
        minSkateabilityScore,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = options;
      
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Cache key based on query parameters
      const cacheKey = `spots:${JSON.stringify({
        page, limit, type, surface, difficulty, verified,
        userId, search, status, nearLocation, radius,
        minSkateabilityScore, sortBy, sortOrder
      })}`;
      
      // Check cache first
      const cachedResult = await cacheManager.get<PaginatedResult<Spot>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Start building query
      let query = supabase
        .from('spots')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (type) {
        query = query.eq('type', type);
      }
      
      if (surface) {
        query = query.eq('surface', surface);
      }
      
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }
      
      if (verified !== undefined) {
        query = query.eq('verified', verified);
      }
      
      if (userId) {
        query = query.eq('created_by', userId);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (minSkateabilityScore !== undefined) {
        query = query.gte('skateability_score', minSkateabilityScore);
      }
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      // Add geospatial query if location is provided
      if (nearLocation && nearLocation.latitude && nearLocation.longitude) {
        // Use PostGIS to find spots within radius kilometers
        query = query.rpc('spots_within_radius', {
          lat: nearLocation.latitude,
          lng: nearLocation.longitude,
          radius_km: radius
        });
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        logger.error('Error getting spots:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Format data
      const spots = data.map(spot => this.formatSpotData(spot));
      
      // Prepare result
      const result: PaginatedResult<Spot> = {
        data: spots,
        pagination: {
          total: count || 0,
          page,
          limit,
          pages: count ? Math.ceil(count / limit) : 0
        }
      };
      
      // Cache result
      await cacheManager.set(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error('Error getting spots:', error);
      throw new Error(`Failed to get spots: ${error.message}`);
    }
  }
  
  /**
   * Search for spots based on various criteria
   * @param query Search query
   * @param options Search options
   * @returns Paginated list of spots
   */
  async searchSpots(
    query: string,
    options: {
      page?: number;
      limit?: number;
      nearLocation?: GeoLocation;
      radius?: number;
    } = {}
  ): Promise<PaginatedResult<Spot>> {
    try {
      const {
        page = 1,
        limit = 20,
        nearLocation,
        radius = 10
      } = options;
      
      return this.getSpots({
        page,
        limit,
        search: query,
        nearLocation,
        radius,
        status: 'active',
        sortBy: 'skateability_score',
        sortOrder: 'desc'
      });
    } catch (error) {
      logger.error('Error searching spots:', error);
      throw new Error(`Failed to search spots: ${error.message}`);
    }
  }
  
  /**
   * Find nearby spots within a radius
   * @param location Center location
   * @param radius Radius in kilometers
   * @param options Additional options
   * @returns Paginated list of nearby spots
   */
  async findNearbySpots(
    location: GeoLocation,
    radius: number = 10,
    options: {
      page?: number;
      limit?: number;
      type?: SpotType;
    } = {}
  ): Promise<PaginatedResult<Spot>> {
    try {
      const { page = 1, limit = 20, type } = options;
      
      return this.getSpots({
        page,
        limit,
        nearLocation: location,
        radius,
        type,
        status: 'active',
        sortBy: 'distance' // Assumes the RPC returns distance
      });
    } catch (error) {
      logger.error('Error finding nearby spots:', error);
      throw new Error(`Failed to find nearby spots: ${error.message}`);
    }
  }
  
  /**
   * Update the skateability score for a spot
   * @param id Spot ID
   * @param score New skateability score (0-10)
   * @returns Updated spot
   */
  async updateSkateabilityScore(id: string, score: number): Promise<Spot> {
    try {
      // Validate score
      if (score < 0 || score > 10) {
        throw new Error('Skateability score must be between 0 and 10');
      }
      
      return this.updateSpot(id, { skateability_score: score });
    } catch (error) {
      logger.error('Error updating skateability score:', error);
      throw new Error(`Failed to update skateability score: ${error.message}`);
    }
  }
  
  /**
   * Get spots submitted by a user
   * @param userId User ID
   * @param options Query options
   * @returns Paginated list of user's spots
   */
  async getUserSpots(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: SpotStatus;
    } = {}
  ): Promise<PaginatedResult<Spot>> {
    try {
      const { page = 1, limit = 20, status } = options;
      
      return this.getSpots({
        page,
        limit,
        userId,
        status,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    } catch (error) {
      logger.error('Error getting user spots:', error);
      throw new Error(`Failed to get user spots: ${error.message}`);
    }
  }
  
  /**
   * Verify a spot (typically by admin or moderator)
   * @param id Spot ID to verify
   * @returns Updated spot
   */
  async verifySpot(id: string): Promise<Spot> {
    try {
      return this.updateSpot(id, { verified: true });
    } catch (error) {
      logger.error('Error verifying spot:', error);
      throw new Error(`Failed to verify spot: ${error.message}`);
    }
  }
  
  /**
   * Change the status of a spot
   * @param id Spot ID
   * @param status New status
   * @returns Updated spot
   */
  async changeSpotStatus(id: string, status: SpotStatus): Promise<Spot> {
    try {
      return this.updateSpot(id, { status });
    } catch (error) {
      logger.error('Error changing spot status:', error);
      throw new Error(`Failed to change spot status: ${error.message}`);
    }
  }
  
  /**
   * Format spot data from database to application model
   * @param data Raw spot data from database
   * @returns Formatted spot data
   * @private
   */
  private formatSpotData(data: any): Spot {
    // Extract location data
    let location: GeoLocation | undefined;
    if (data.latitude !== null && data.longitude !== null) {
      location = {
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
    
    // Format features
    const features: SpotFeatures = data.features || {};
    
    // Construct the spot object
    const spot: Spot = {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      surface: data.surface,
      difficulty: data.difficulty,
      features,
      location,
      address: data.address,
      images: data.images || [],
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      status: data.status,
      verified: data.verified || false,
      skateability_score: data.skateability_score
    };
    
    return spot;
  }
  
  /**
   * Invalidate all spot-related caches
   * @private
   */
  private async invalidateSpotCaches(): Promise<void> {
    try {
      // Get all keys related to spots
      const keys = await cacheManager.keys('spots:*');
      
      // Delete all keys
      if (keys.length > 0) {
        await cacheManager.del(keys);
      }
    } catch (error) {
      logger.error('Error invalidating spot caches:', error);
    }
  }
}

// Export singleton instance
export const spotStorageService = new SpotStorageService(); 