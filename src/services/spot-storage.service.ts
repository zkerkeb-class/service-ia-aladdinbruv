import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { supabase, supabaseAdmin } from './supabase.service';
import { getCache, setCache, deleteCache, clearCachePattern } from '../config/cache';
import logger from '../config/logger';
import { env } from '../config/env';
import { 
  Spot, 
  SpotType, 
  SurfaceType, 
  SpotFeatures, 
  GeoLocation,
  DifficultyRating, 
  PaginationResult, 
  SpotStatus
} from '../types';

/**
 * Service for managing skateboarding spots in the database
 */
export class SpotStorageService {
  private cacheTTL = 60 * 60; // 1 hour in seconds
  private bucketName = env.STORAGE_BUCKET || 'spot-images';

  /**
   * Get the admin client for database operations that need to bypass RLS
   * @returns Supabase admin client
   */
  private getAdminClient() {
    try {
      return supabaseAdmin;
    } catch (error) {
      logger.warn('Admin client not available, falling back to regular client:', error);
      return supabase;
    }
  }
  
  /**
   * Create a new spot in the database
   * @param spot Spot data to create
   * @returns Created spot with ID
   */
  async createSpot(spot: any): Promise<Spot> {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Handle both nested location object and flat latitude/longitude
      let latitude: number, longitude: number;
      if (spot.location && typeof spot.location === 'object') {
        latitude = spot.location.latitude;
        longitude = spot.location.longitude;
      } else if (spot.latitude && spot.longitude) {
        latitude = spot.latitude;
        longitude = spot.longitude;
      } else {
        throw new Error('Missing location data: latitude and longitude are required');
      }
      
      // Extract images from spot data since they're stored in a separate table
      const { images, ...spotDataWithoutImages } = spot;
      
      const newSpotData = {
        ...spotDataWithoutImages,
        id,
        created_at: timestamp,
        updated_at: timestamp,
        status: spot.status || 'active',
        verified: spot.verified || false,
        skateability_score: spot.skateability_score || 5,
        location: `POINT(${longitude} ${latitude})`,
        latitude: latitude,
        longitude: longitude,
        features: spot.features || {}
      };

      const { data, error } = await supabase
        .from('spots')
        .insert([newSpotData])
        .select()
        .single();
      
      if (error) {
        logger.error('Error creating spot:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Handle images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        const imagePromises = images.map((imageUrl: string, index: number) => {
          return supabase
            .from('spot_images')
            .insert({
              id: uuidv4(),
              spot_id: id,
              user_id: spot.user_id,
              image_url: imageUrl,
              is_primary: index === 0, // First image is primary
              angle: 'main',
              created_at: timestamp
            });
        });
        
        try {
          await Promise.all(imagePromises);
        } catch (imageError) {
          logger.warn('Some images failed to save:', imageError);
          // Don't fail the entire spot creation if images fail
        }
      }
      
      await this.invalidateSpotCaches();
      
      return this.formatSpotData(data);
    } catch (error) {
      logger.error('Error creating spot:', error);
      if (error instanceof Error) throw new Error(`Failed to create spot: ${error.message}`);
      throw new Error('Failed to create spot due to an unknown error.');
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
      
      await deleteCache(`spot:${id}`);
      await this.invalidateSpotCaches();
      
      return this.formatSpotData(data);
    } catch (error) {
      logger.error('Error updating spot:', error);
      if (error instanceof Error) throw new Error(`Failed to update spot: ${error.message}`);
      throw new Error('Failed to update spot');
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
      
      await deleteCache(`spot:${id}`);
      await this.invalidateSpotCaches();
      
      return true;
    } catch (error) {
      logger.error('Error deleting spot:', error);
      if (error instanceof Error) throw new Error(`Failed to delete spot: ${error.message}`);
      throw new Error('Failed to delete spot');
    }
  }
  
  /**
   * Get a spot by its ID
   * @param id Spot ID to retrieve
   * @returns Spot data or null if not found
   */
  async getSpotById(id: string): Promise<Spot | null> {
    try {
      const cachedSpot = await getCache<Spot>(`spot:${id}`);
      if (cachedSpot) {
        return cachedSpot;
      }
      
      // Fetch from database
      const { data, error } = await this.getAdminClient()
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
      
      await setCache(`spot:${id}`, formatted, this.cacheTTL);
      
      return formatted;
    } catch (error) {
      logger.error('Error getting spot by ID:', error);
      if (error instanceof Error) throw new Error(`Failed to get spot: ${error.message}`);
      throw new Error('Failed to get spot');
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
  } = {}): Promise<PaginationResult<Spot>> {
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
      
      const cacheKey = `spots:${JSON.stringify(options)}`;
      const cachedSpots = await getCache<PaginationResult<Spot>>(cacheKey);
      if (cachedSpots) return cachedSpots;

      let query;
      
      if (nearLocation) {
        query = this.getAdminClient().rpc('find_spots_near', {
          lat: nearLocation.latitude,
          lon: nearLocation.longitude,
          radius_km: radius
        });
      } else {
        query = this.getAdminClient().from('spots').select('*', { count: 'exact' });
      }

      if (type) query = query.eq('type', type);
      if (surface) query = query.eq('surface', surface);
      if (difficulty) query = query.eq('difficulty', difficulty);
      if (verified) query = query.eq('verified', verified);
      if (status) query = query.eq('status', status);
      if (minSkateabilityScore) query = query.gte('skateability_score', minSkateabilityScore);
      if (userId) query = query.eq('user_id', userId);

      // Search functionality
      if (search) {
        query = query.textSearch('name', search, { type: 'websearch', config: 'english' });
      }

      if (sortBy) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        logger.error('Error getting spots:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const spots = data.map((spot: any) => this.formatSpotData(spot));
      const total = count || 0;

      const result: PaginationResult<Spot> = {
        data: spots,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      await setCache(cacheKey, result, this.cacheTTL);

      return result;
    } catch (error) {
      logger.error('Error getting spots:', error);
      if (error instanceof Error) throw new Error(`Failed to get spots: ${error.message}`);
      throw new Error('Failed to get spots');
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
  ): Promise<PaginationResult<Spot>> {
    try {
      return this.getSpots({ search: query, ...options });
    } catch (error) {
      logger.error('Error searching spots:', error);
      if (error instanceof Error) throw new Error(`Failed to search spots: ${error.message}`);
      throw new Error('Failed to search spots');
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
  ): Promise<PaginationResult<Spot>> {
    try {
      return this.getSpots({ nearLocation: location, radius, ...options });
    } catch (error) {
      logger.error('Error finding nearby spots:', error);
      if (error instanceof Error) throw new Error(`Failed to find nearby spots: ${error.message}`);
      throw new Error('Failed to find nearby spots');
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
      if (error instanceof Error) throw new Error(`Failed to update skateability score: ${error.message}`);
      throw new Error('Failed to update skateability score');
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
  ): Promise<PaginationResult<Spot>> {
    try {
      return this.getSpots({ userId, ...options });
    } catch (error) {
      logger.error('Error getting user spots:', error);
      if (error instanceof Error) throw new Error(`Failed to get user spots: ${error.message}`);
      throw new Error('Failed to get user spots');
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
      if (error instanceof Error) throw new Error(`Failed to verify spot: ${error.message}`);
      throw new Error('Failed to verify spot');
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
      if (error instanceof Error) throw new Error(`Failed to change spot status: ${error.message}`);
      throw new Error('Failed to change spot status');
    }
  }
  
  /**
   * Format spot data from database to application model
   * @param data Raw spot data from database
   * @returns Formatted spot data
   * @private
   */
  private formatSpotData(data: any): Spot {
    const { latitude, longitude, ...rest } = data;
    if (!latitude || !longitude) {
      throw new Error(`Spot with id ${data.id} has no location data.`);
    }

    const location: GeoLocation = { latitude, longitude };

    return {
      ...rest,
      location,
      created_at: new Date(data.created_at).toISOString(),
      updated_at: new Date(data.updated_at).toISOString(),
    } as Spot;
  }
  
  /**
   * Invalidate all spot-related caches
   * @private
   */
  private async invalidateSpotCaches(): Promise<void> {
    try {
      await clearCachePattern('spots:*');
      logger.info('Invalidated spot caches.');
    } catch (error) {
      logger.error('Error invalidating spot caches:', error);
    }
  }

  /**
   * Upload a local image file to Supabase storage and link it to a spot in DB
   */
  async uploadSpotImageFile(
    spotId: string,
    localFilePath: string,
    userId: string,
    isPrimary: boolean = false,
    angle: string = 'main'
  ): Promise<{ imageUrl: string }> {
    try {
      const admin = this.getAdminClient();
      const fileExt = path.extname(localFilePath) || '.jpg';
      const contentType = mime.lookup(fileExt) || 'image/jpeg';
      const fileKey = `spots/${spotId}/${uuidv4()}${fileExt}`;

      const fileBuffer = fs.readFileSync(localFilePath);
      const { error: uploadErr } = await admin.storage
        .from(this.bucketName)
        .upload(fileKey, fileBuffer, { contentType, upsert: false });
      if (uploadErr) {
        logger.error('Supabase storage upload error:', uploadErr);
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      const { data: pub } = admin.storage.from(this.bucketName).getPublicUrl(fileKey);
      const publicUrl = pub.publicUrl;

      const timestamp = new Date().toISOString();
      const { error: imgErr } = await admin
        .from('spot_images')
        .insert({
          id: uuidv4(),
          spot_id: spotId,
          user_id: userId,
          image_url: publicUrl,
          is_primary: isPrimary,
          angle,
          created_at: timestamp,
        });
      if (imgErr) {
        logger.error('Error inserting spot_images row:', imgErr);
        throw new Error(`Failed to link image: ${imgErr.message}`);
      }

      try { fs.unlinkSync(localFilePath); } catch { /* ignore cleanup errors */ }

      return { imageUrl: publicUrl };
    } catch (error) {
      logger.error('uploadSpotImageFile error:', error);
      throw error instanceof Error ? error : new Error('Failed to upload image');
    }
  }

  async getSpotsByUserId(userId: string): Promise<PaginationResult<Spot>> {
    return this.getUserSpots(userId, {});
  }
}

// Export singleton instance
export const spotStorageService = new SpotStorageService(); 