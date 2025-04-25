import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SpotAnalysisService } from '../services/spot-analysis.service';
import  logger  from '../config/logger';
import { AuthRequest } from '../middleware/auth.middleware';

class SpotController {
  private spotAnalysisService: SpotAnalysisService;

  constructor() {
    this.spotAnalysisService = new SpotAnalysisService();
  }

  analyzeSpot = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      // Use userId from auth token
      // Rest of controller logic
      
      return res.status(StatusCodes.OK).json({ message: 'Spot analyzed successfully', userId });
    } catch (error) {
      logger.error('Error analyzing spot:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        error: 'Failed to analyze spot' 
      });
    }
  };

  analyzeSpotImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'No image file provided' 
        });
      }

      const imagePath = req.file.path;
      const result = await this.spotAnalysisService.analyzeSpotImage(imagePath);

      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('Error analyzing spot image:', error);
      next(error);
    }
  };

  getSpotRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, preferences, location } = req.body;
      
      if (!userId || !preferences || !location) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'Missing required parameters: userId, preferences, or location' 
        });
      }

      const result = await this.spotAnalysisService.getSpotRecommendations(
        userId, 
        preferences, 
        location
      );

      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('Error getting spot recommendations:', error);
      next(error);
    }
  };

  rateDifficulty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath, spotFeatures } = req.body;
      
      if (!imagePath) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'Missing required parameter: imagePath' 
        });
      }

      const result = await this.spotAnalysisService.rateDifficulty(imagePath, spotFeatures);
      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('Error rating spot difficulty:', error);
      next(error);
    }
  };

  detectSpotType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath } = req.body;
      
      if (!imagePath) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'Missing required parameter: imagePath' 
        });
      }

      const result = await this.spotAnalysisService.detectSpotType(imagePath);
      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('Error detecting spot type:', error);
      next(error);
    }
  };

  measureObstacle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath, obstacleType } = req.body;
      
      if (!imagePath || !obstacleType) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'Missing required parameters: imagePath or obstacleType' 
        });
      }

      const result = await this.spotAnalysisService.measureObstacle(imagePath, obstacleType);
      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('Error measuring obstacle:', error);
      next(error);
    }
  };

  analyzeSurface = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath } = req.body;
      
      if (!imagePath) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'Missing required parameter: imagePath' 
        });
      }

      const result = await this.spotAnalysisService.analyzeSurface(imagePath);
      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      logger.error('Error analyzing surface:', error);
      next(error);
    }
  };
}

export const spotController = new SpotController(); 