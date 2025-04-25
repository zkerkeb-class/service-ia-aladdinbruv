import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database';
import { Review, SkateabilityRating, PaginationOptions, PaginationResult } from '../types';
import logger from '../config/logger';
import { getCache, setCache, deleteCache, clearCachePattern } from '../config/cache';
import { env } from '../config/env';
import { spotStorageService } from './spot-storage.service';

/**
 * Service for social features like reviews, ratings, and comments
 */
export class SocialService {
  private readonly reviewTable = 'spot_reviews';
  private readonly spotTable = 'spots';
  private readonly cacheTTL = env.CACHE_TTL;

  /**
   * Add a review for a spot
   * @param spotId Spot ID to review
   * @param userId User ID creating the review
   * @param rating Rating from 1-10
   * @param comment Optional comment
   * @returns The created review
   */
  async addReview(
    spotId: string, 
    userId: string, 
    rating: SkateabilityRating, 
    comment?: string
  ): Promise<Review> {
    try {
      // Check if user already reviewed this spot
      const { data: existingReview, error: checkError } = await supabase
        .from(this.reviewTable)
        .select()
        .eq('spot_id', spotId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) {
        logger.error(`Error checking existing review for spot ${spotId} by user ${userId}:`, checkError.message);
        throw new Error(`Failed to check existing review: ${checkError.message}`);
      }
      
      // Generate ID for new review
      const id = uuidv4();
      const now = new Date().toISOString();
      
      let data: Review;
      let error: any;
      
      // Update existing review or create a new one
      if (existingReview) {
        // Update existing review
        const result = await supabase
          .from(this.reviewTable)
          .update({
            rating,
            comment: comment || null,
            updated_at: now,
          })
          .eq('id', existingReview.id)
          .select()
          .single();
        
        data = result.data as Review;
        error = result.error;
      } else {
        // Create new review
        const result = await supabase
          .from(this.reviewTable)
          .insert({
            id,
            spot_id: spotId,
            user_id: userId,
            rating,
            comment: comment || null,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        
        data = result.data as Review;
        error = result.error;
      }
      
      if (error) {
        logger.error(`Error saving review for spot ${spotId}:`, error.message);
        throw new Error(`Failed to save review: ${error.message}`);
      }
      
      // Update average rating for the spot
      await this.updateSpotRating(spotId);
      
      // Clear cache
      await clearCachePattern(`reviews:spot:${spotId}:*`);
      await clearCachePattern(`reviews:user:${userId}:*`);
      
      return data;
    } catch (error) {
      logger.error(`Error in addReview for spot ${spotId} by user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all reviews for a spot
   * @param spotId Spot ID
   * @param options Pagination options
   * @returns Reviews for the spot with pagination info
   */
  async getSpotReviews(
    spotId: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Review>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;
      
      // Try to get from cache first
      const cacheKey = `reviews:spot:${spotId}:${page}:${limit}`;
      const cachedResult = await getCache<PaginationResult<Review>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Count total reviews for the spot
      const { count, error: countError } = await supabase
        .from(this.reviewTable)
        .select('*', { count: 'exact', head: true })
        .eq('spot_id', spotId);
      
      if (countError) {
        logger.error(`Error counting reviews for spot ${spotId}:`, countError.message);
        throw new Error(`Failed to count reviews: ${countError.message}`);
      }
      
      // Get paginated data
      const { data: reviews, error } = await supabase
        .from(this.reviewTable)
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        logger.error(`Error getting reviews for spot ${spotId}:`, error.message);
        throw new Error(`Failed to get reviews: ${error.message}`);
      }
      
      const total = count || 0;
      const result: PaginationResult<Review> = {
        data: reviews as Review[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
      
      // Cache for future requests
      await setCache(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error(`Error in getSpotReviews for ${spotId}:`, error);
      throw error;
    }
  }

  /**
   * Get all reviews by a user
   * @param userId User ID
   * @param options Pagination options
   * @returns Reviews by the user with pagination info
   */
  async getUserReviews(
    userId: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Review>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;
      
      // Try to get from cache first
      const cacheKey = `reviews:user:${userId}:${page}:${limit}`;
      const cachedResult = await getCache<PaginationResult<Review>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Count total reviews by the user
      const { count, error: countError } = await supabase
        .from(this.reviewTable)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) {
        logger.error(`Error counting reviews for user ${userId}:`, countError.message);
        throw new Error(`Failed to count user reviews: ${countError.message}`);
      }
      
      // Get paginated data
      const { data: reviews, error } = await supabase
        .from(this.reviewTable)
        .select(`
          *,
          spots:spot_id (name, difficulty, type)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        logger.error(`Error getting reviews for user ${userId}:`, error.message);
        throw new Error(`Failed to get user reviews: ${error.message}`);
      }
      
      const total = count || 0;
      const result: PaginationResult<Review> = {
        data: reviews as Review[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
      
      // Cache for future requests
      await setCache(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error(`Error in getUserReviews for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a review
   * @param reviewId Review ID to delete
   * @returns True if deleted, false if not found
   */
  async deleteReview(reviewId: string): Promise<boolean> {
    try {
      // Get the review first to know the spot_id and user_id for cache invalidation
      const { data: review, error: getError } = await supabase
        .from(this.reviewTable)
        .select()
        .eq('id', reviewId)
        .single();
      
      if (getError) {
        if (getError.code === 'PGRST116') {
          // PGRST116 indicates no rows returned
          return false;
        }
        logger.error(`Error getting review ${reviewId}:`, getError.message);
        throw new Error(`Failed to get review: ${getError.message}`);
      }
      
      // Delete the review
      const { error } = await supabase
        .from(this.reviewTable)
        .delete()
        .eq('id', reviewId);
      
      if (error) {
        logger.error(`Error deleting review ${reviewId}:`, error.message);
        throw new Error(`Failed to delete review: ${error.message}`);
      }
      
      // Update spot rating
      if (review.spot_id) {
        await this.updateSpotRating(review.spot_id);
      }
      
      // Clear cache
      if (review.spot_id) {
        await clearCachePattern(`reviews:spot:${review.spot_id}:*`);
      }
      
      if (review.user_id) {
        await clearCachePattern(`reviews:user:${review.user_id}:*`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error in deleteReview for ${reviewId}:`, error);
      throw error;
    }
  }

  /**
   * Get a review by ID
   * @param reviewId Review ID
   * @returns The review or null if not found
   */
  async getReviewById(reviewId: string): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from(this.reviewTable)
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          spots:spot_id (name, difficulty, type)
        `)
        .eq('id', reviewId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 indicates no rows returned
          return null;
        }
        logger.error(`Error getting review ${reviewId}:`, error.message);
        throw new Error(`Failed to get review: ${error.message}`);
      }
      
      return data as Review;
    } catch (error) {
      logger.error(`Error in getReviewById for ${reviewId}:`, error);
      throw error;
    }
  }

  /**
   * Get a user's review for a specific spot
   * @param spotId Spot ID
   * @param userId User ID
   * @returns The review or null if not found
   */
  async getUserReviewForSpot(spotId: string, userId: string): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from(this.reviewTable)
        .select()
        .eq('spot_id', spotId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        logger.error(`Error getting user review for spot ${spotId} by user ${userId}:`, error.message);
        throw new Error(`Failed to get user review for spot: ${error.message}`);
      }
      
      return data as Review | null;
    } catch (error) {
      logger.error(`Error in getUserReviewForSpot for spot ${spotId} and user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and update the average rating for a spot
   * @param spotId Spot ID to update
   * @private
   */
  private async updateSpotRating(spotId: string): Promise<void> {
    try {
      // Calculate average rating
      const { data: reviews, error: reviewsError } = await supabase
        .from(this.reviewTable)
        .select('rating')
        .eq('spot_id', spotId);
      
      if (reviewsError) {
        logger.error(`Error getting ratings for spot ${spotId}:`, reviewsError.message);
        throw new Error(`Failed to get ratings: ${reviewsError.message}`);
      }
      
      if (!reviews.length) {
        // No reviews, set default score
        await supabase
          .from(this.spotTable)
          .update({ skateability_score: null })
          .eq('id', spotId);
        return;
      }
      
      // Calculate average
      const sum = reviews.reduce((total, review) => total + review.rating, 0);
      const average = Math.round(sum / reviews.length) as SkateabilityRating;
      
      // Update spot
      const { error: updateError } = await supabase
        .from(this.spotTable)
        .update({ skateability_score: average })
        .eq('id', spotId);
      
      if (updateError) {
        logger.error(`Error updating rating for spot ${spotId}:`, updateError.message);
        throw new Error(`Failed to update spot rating: ${updateError.message}`);
      }
      
      // Clear spot cache
      await deleteCache(`spots:${spotId}`);
    } catch (error) {
      logger.error(`Error in updateSpotRating for ${spotId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics for a spot's reviews
   * @param spotId Spot ID
   * @returns Rating statistics
   */
  async getSpotReviewStats(spotId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      // Get all ratings for the spot
      const { data: reviews, error } = await supabase
        .from(this.reviewTable)
        .select('rating')
        .eq('spot_id', spotId);
      
      if (error) {
        logger.error(`Error getting reviews for spot stats ${spotId}:`, error.message);
        throw new Error(`Failed to get reviews for stats: ${error.message}`);
      }
      
      if (!reviews.length) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {},
        };
      }
      
      // Calculate average
      const sum = reviews.reduce((total, review) => total + review.rating, 0);
      const average = parseFloat((sum / reviews.length).toFixed(1));
      
      // Calculate distribution
      const distribution: { [key: number]: number } = {};
      for (let i = 1; i <= 10; i++) {
        distribution[i] = 0;
      }
      
      reviews.forEach(review => {
        distribution[review.rating]++;
      });
      
      return {
        averageRating: average,
        totalReviews: reviews.length,
        ratingDistribution: distribution,
      };
    } catch (error) {
      logger.error(`Error in getSpotReviewStats for ${spotId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const socialService = new SocialService(); 