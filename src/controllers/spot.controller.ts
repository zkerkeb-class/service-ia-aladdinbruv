import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SpotAnalysisService } from '../services/spot-analysis.service';
import { SpotStorageService } from '../services/spot-storage.service';
import  logger  from '../config/logger';
import { AuthRequest } from '../middleware/auth.middleware';

class SpotController {
  private spotAnalysisService: SpotAnalysisService;
  private spotStorageService: SpotStorageService;

  constructor() {
    this.spotAnalysisService = new SpotAnalysisService();
    this.spotStorageService = new SpotStorageService();
  }

  getSpots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { latitude, longitude, radius, type, sortBy, limit, userId } = req.query;

      const options: any = {
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string,
        userId: userId as string | undefined,
      };

      if (type) {
        options.type = type as string;
      }
      
      if (latitude && longitude) {
        options.nearLocation = {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        };
        options.radius = radius ? parseInt(radius as string) / 1000 : 50; // Convert meters to km
      }

      const result = await this.spotStorageService.getSpots(options);

      return res.status(StatusCodes.OK).json({
        success: true,
        data: result.data // The service returns a paginated result
      });
    } catch (error) {
      logger.error('Error fetching spots:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch spots'
      });
    }
  };

  analyzeSpot = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      // Use userId from auth token
      // Rest of controller logic
      
      return res.status(StatusCodes.OK).json({ 
        success: true,
        message: 'Spot analyzed successfully', 
        data: { userId } 
      });
    } catch (error) {
      logger.error('Error analyzing spot:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: 'Failed to analyze spot' 
      });
    }
  };

  analyzeSpotImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          success: false,
          message: 'No image file provided' 
        });
      }

      const { userId, email } = req.user || {};

      if (!userId || !email) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User information is missing from the request.'
        });
      }

      const imagePath = req.file.path;
      const result = await this.spotAnalysisService.analyzeSpotImage(imagePath, userId, email);

      // Restructure the response to include success and data fields
      return res.status(StatusCodes.OK).json({
        success: true,
        data: {
          ...result,
          // Map the analysis result fields to what the frontend expects
          score: result.skateabilityScore || Math.round(result.confidence * 10),
          tricks: result.suggestedTricks || [],
          surface: result.surfaceQuality,
          measurements: result.features,
          type: result.type || 'unknown',
          difficulty: result.difficulty || 'medium'
        }
      });
    } catch (error) {
      logger.error('Error analyzing spot image:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to analyze spot image'
      });
    }
  };

  getSpotRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, preferences, location } = req.body;
      
      if (!userId || !preferences || !location) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          success: false,
          message: 'Missing required parameters: userId, preferences, or location' 
        });
      }

      const result = await this.spotAnalysisService.getSpotRecommendations(
        userId, 
        preferences, 
        location
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting spot recommendations:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get spot recommendations'
      });
    }
  };

  rateDifficulty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath, spotFeatures } = req.body;
      
      if (!imagePath) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          success: false,
          message: 'Missing required parameter: imagePath' 
        });
      }

      const result = await this.spotAnalysisService.rateDifficulty(imagePath, spotFeatures);
      return res.status(StatusCodes.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error rating spot difficulty:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rate spot difficulty'
      });
    }
  };

  detectSpotType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath } = req.body;
      
      if (!imagePath) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          success: false,
          message: 'Missing required parameter: imagePath' 
        });
      }

      const result = await this.spotAnalysisService.detectSpotType(imagePath);
      return res.status(StatusCodes.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error detecting spot type:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to detect spot type'
      });
    }
  };

  measureObstacle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath, obstacleType } = req.body;
      
      if (!imagePath || !obstacleType) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          success: false,
          message: 'Missing required parameters: imagePath or obstacleType' 
        });
      }

      const result = await this.spotAnalysisService.measureObstacle(imagePath, obstacleType);
      return res.status(StatusCodes.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error measuring obstacle:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to measure obstacle'
      });
    }
  };

  analyzeSurface = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imagePath } = req.body;
      
      if (!imagePath) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          success: false,
          message: 'Missing required parameter: imagePath' 
        });
      }

      const result = await this.spotAnalysisService.analyzeSurface(imagePath);
      return res.status(StatusCodes.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error analyzing surface:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to analyze surface'
      });
    }
  };

  getSpotsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const result = await this.spotStorageService.getSpotsByUserId(userId);

      return res.status(StatusCodes.OK).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Error fetching spots by user:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch spots for the user'
      });
    }
  };

  createSpot = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user || {};

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User information is missing from the request.'
        });
      }

      const spotData = {
        ...req.body,
        user_id: userId,
        created_by: userId
      };

      // Validate required fields
      if (!spotData.name) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Missing required field: name is required'
        });
      }

      // Handle both nested location object and flat latitude/longitude
      if (spotData.location && spotData.location.latitude && spotData.location.longitude) {
        // Use nested location object
        spotData.latitude = spotData.location.latitude;
        spotData.longitude = spotData.location.longitude;
      } else if (!spotData.latitude || !spotData.longitude) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Missing required fields: latitude and longitude are required'
        });
      }

      const result = await this.spotStorageService.createSpot(spotData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        data: result,
        message: 'Spot created successfully'
      });
    } catch (error) {
      logger.error('Error creating spot:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create spot'
      });
    }
  };
}

export const spotController = new SpotController(); 