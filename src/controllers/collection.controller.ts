import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CollectionService } from '../services/collection.service';
import logger from '../config/logger';

class CollectionController {
  private collectionService: CollectionService;

  constructor() {
    this.collectionService = new CollectionService();
  }

  getCollections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use authenticated user's ID from the auth middleware
      const userId = (req as any).user?.userId;
      
      console.log('🔍 getCollections - req.user:', (req as any).user);
      console.log('🔍 getCollections - userId:', userId);
      
      if (!userId) {
        console.log('❌ getCollections - No userId found');
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
      }
      
      console.log('🔍 getCollections - Calling getUserCollections with userId:', userId);
      const collectionsResult = await this.collectionService.getUserCollections(userId);
      console.log('🔍 getCollections - Result:', collectionsResult);
      
      return res.status(StatusCodes.OK).json({
        success: true,
        data: collectionsResult,
      });
    } catch (error) {
      console.error('❌ getCollections - Error:', error);
      logger.error('Error fetching collections:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch collections',
      });
    }
  };

  getCollectionsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const collections = await this.collectionService.getCollectionsByUser(userId);
      res.status(200).json({ success: true, data: collections });
    } catch (error) {
      next(error);
    }
  }

  getAchievementsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const achievements = await this.collectionService.getAchievementsByUser(userId);
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      next(error);
    }
  }
}

export const collectionController = new CollectionController(); 