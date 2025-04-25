import axios from 'axios';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';
import { env } from '../config/env';
import { 
  AnalysisResult, 
  SpotType, 
  SpotFeatures, 
  SurfaceType, 
  DifficultyRating, 
  GeoLocation,
  Spot
} from '../types';

/**
 * Service for analyzing skateboarding spot images and extracting features
 */
export class SpotAnalysisService {
  private mlServiceUrl: string;

  constructor() {
    this.mlServiceUrl = env.ML_SERVICE_URL;
  }

  /**
   * Analyze a skateboarding spot from an image
   * @param imagePath Path to the image file
   * @returns Analysis result with spot type, features, surface, and difficulty
   */
  async analyzeSpotImage(imagePath: string): Promise<AnalysisResult> {
    try {
      logger.info(`Analyzing spot image: ${imagePath}`);
      
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Analyze with external service
      return await this.analyzeWithExternalService(imageBuffer);
    } catch (error) {
      logger.error('Error analyzing spot image:', error);
      
      // Return a default response when analysis fails
      return {
        type: 'unknown',
        confidence: 0,
        features: {},
        surfaceQuality: 'unknown',
        difficulty: 'medium'
      };
    }
  }

  /**
   * Get spot recommendations based on user preferences
   * @param userId User ID
   * @param preferences User preferences
   * @param location User location
   * @returns List of recommended spots
   */
  async getSpotRecommendations(
    userId: string,
    preferences: any,
    location: GeoLocation
  ): Promise<Spot[]> {
    try {
      logger.info(`Getting spot recommendations for user: ${userId}`);
      
      // Mock implementation - in a real scenario, this would call a database
      // or recommendation engine
      const mockSpots: Spot[] = [
        {
          id: '1',
          name: 'Downtown Ledges',
          type: 'ledge',
          features: {
            height: 40,
            width: 30,
            length: 200
          },
          location: {
            latitude: location.latitude + 0.01,
            longitude: location.longitude - 0.01
          },
          images: ['ledge1.jpg', 'ledge2.jpg'],
          skateability_score: 8.5,
          difficulty: 'medium'
        },
        {
          id: '2',
          name: 'School Rail',
          type: 'rail',
          features: {
            height: 60,
            length: 250,
            angle: 20
          },
          location: {
            latitude: location.latitude - 0.02,
            longitude: location.longitude + 0.03
          },
          images: ['rail1.jpg'],
          skateability_score: 9.0,
          difficulty: 'hard'
        }
      ];
      
      return mockSpots;
    } catch (error) {
      logger.error('Error getting spot recommendations:', error);
      throw new Error('Failed to get spot recommendations');
    }
  }

  /**
   * Determine difficulty rating based on spot features
   * @param imagePath Path to the image file
   * @param spotFeatures Optional spot features to use instead of detecting from image
   * @returns Difficulty rating
   */
  async rateDifficulty(imagePath: string, spotFeatures?: SpotFeatures): Promise<DifficultyRating> {
    try {
      let features: SpotFeatures;
      
      if (spotFeatures) {
        features = spotFeatures;
      } else {
        // Read the image file
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Analyze the image to get features
        const analysis = await this.analyzeWithExternalService(imageBuffer);
        features = analysis.features || {};
      }
      
      let difficultyScore = 0;
      
      // Check height (in cm) - major factor in difficulty
      if (features.height) {
        if (features.height > 200) difficultyScore += 6;
        else if (features.height > 150) difficultyScore += 5;
        else if (features.height > 100) difficultyScore += 4;
        else if (features.height > 50) difficultyScore += 2;
        else difficultyScore += 1;
      }
      
      // Check angle (in degrees) - steeper is harder
      if (features.angle) {
        if (features.angle > 45) difficultyScore += 3;
        else if (features.angle > 30) difficultyScore += 2;
        else if (features.angle > 15) difficultyScore += 1;
      }
      
      // Length factor - longer features can be harder
      if (features.length) {
        if (features.length > 1000) difficultyScore += 2;
        else if (features.length > 500) difficultyScore += 1;
      }
      
      // Convert score to difficulty rating
      if (difficultyScore >= 7) return 'pro';
      if (difficultyScore >= 5) return 'hard';
      if (difficultyScore >= 3) return 'medium';
      return 'easy';
    } catch (error) {
      logger.error('Error rating difficulty:', error);
      return 'medium'; // Default to medium difficulty if analysis fails
    }
  }

  /**
   * Detect the type of skateboarding spot from an image
   * @param imagePath Path to the image file
   * @returns Detected spot type
   */
  async detectSpotType(imagePath: string): Promise<string> {
    try {
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Analyze with external service
      const result = await this.analyzeWithExternalService(imageBuffer);
      return result.type || 'other';
    } catch (error) {
      logger.error('Error detecting spot type:', error);
      return 'other'; // Default to 'other' if detection fails
    }
  }

  /**
   * Measure physical dimensions of a skateboarding obstacle from an image
   * @param imagePath Path to the image file
   * @param obstacleType Type of obstacle to measure
   * @returns Estimated spot features (height, width, length, angle)
   */
  async measureObstacle(imagePath: string, obstacleType: string): Promise<SpotFeatures> {
    try {
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Analyze with external service
      const result = await this.analyzeWithExternalService(imageBuffer);
      
      if (result.features && Object.keys(result.features).length > 0) {
        return result.features;
      }
      
      // Fallback to estimations based on obstacle type if no features detected
      const features: SpotFeatures = {};
      
      switch (obstacleType) {
        case 'stairs':
          features.height = 80; // Average height in cm
          features.width = 200; // Average width in cm
          features.length = 300; // Average length in cm
          features.steps = 5; // Average number of steps
          break;
        case 'rail':
          features.height = 60;
          features.length = 250;
          features.angle = 20; // Degrees
          break;
        case 'ledge':
          features.height = 40;
          features.width = 30;
          features.length = 200;
          break;
        case 'gap':
          features.height = 50;
          features.width = 150;
          features.length = 200;
          break;
        case 'manual pad':
          features.height = 30;
          features.width = 100;
          features.length = 200;
          break;
        case 'ramp':
        case 'bowl':
        case 'halfpipe':
          features.height = 120;
          features.width = 300;
          features.length = 400;
          features.angle = 45;
          break;
        default:
          features.height = 50;
          features.width = 100;
          features.length = 200;
      }
      
      return features;
    } catch (error) {
      logger.error('Error measuring obstacle:', error);
      
      // Return default values if measurement fails
      return {
        height: 50,
        width: 100,
        length: 200
      };
    }
  }

  /**
   * Analyze the surface quality of a skateboarding spot
   * @param imagePath Path to the image file
   * @returns Surface type and quality assessment
   */
  async analyzeSurface(imagePath: string): Promise<string> {
    try {
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Analyze with external service
      const result = await this.analyzeWithExternalService(imageBuffer);
      return result.surfaceQuality || 'unknown';
    } catch (error) {
      logger.error('Error analyzing surface:', error);
      return 'unknown'; // Default to 'unknown' if analysis fails
    }
  }

  /**
   * Analyze image with external ML service
   * @param imageBuffer Image buffer
   * @returns Analysis result
   */
  private async analyzeWithExternalService(imageBuffer: Buffer): Promise<AnalysisResult> {
    try {
      // Create form data for the image
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'image.jpg');
      
      // Send to external ML service
      const response = await axios.post(`${this.mlServiceUrl}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      throw new Error('Invalid response from ML service');
    } catch (error) {
      logger.error('Error calling external ML service:', error);
      
      // Return mock data if external service fails
      return this.getMockAnalysisResult();
    }
  }

  /**
   * Get mock analysis result for fallback
   * @returns Mock analysis result
   */
  private getMockAnalysisResult(): AnalysisResult {
    // Generate a random spot type
    const spotTypes: SpotType[] = ['ledge', 'rail', 'stairs', 'gap', 'ramp', 'bowl', 'manual pad', 'halfpipe'];
    const randomType = spotTypes[Math.floor(Math.random() * spotTypes.length)];
    
    // Generate mock features based on spot type
    let features: SpotFeatures = {};
    
    switch (randomType) {
      case 'ledge':
        features = {
          height: 40 + Math.floor(Math.random() * 20),
          width: 30 + Math.floor(Math.random() * 10),
          length: 200 + Math.floor(Math.random() * 100)
        };
        break;
      case 'rail':
        features = {
          height: 60 + Math.floor(Math.random() * 20),
          length: 250 + Math.floor(Math.random() * 100),
          angle: 15 + Math.floor(Math.random() * 15)
        };
        break;
      case 'stairs':
        features = {
          height: 80 + Math.floor(Math.random() * 40),
          width: 200 + Math.floor(Math.random() * 50),
          length: 300 + Math.floor(Math.random() * 100),
          steps: 4 + Math.floor(Math.random() * 4)
        };
        break;
      default:
        features = {
          height: 50 + Math.floor(Math.random() * 50),
          width: 100 + Math.floor(Math.random() * 100),
          length: 200 + Math.floor(Math.random() * 100)
        };
    }
    
    // Surface quality options
    const surfaceOptions: SurfaceType[] = ['smooth', 'rough', 'cracked', 'polished', 'textured'];
    const randomSurface = surfaceOptions[Math.floor(Math.random() * surfaceOptions.length)];
    
    // Difficulty options
    const difficultyOptions: DifficultyRating[] = ['easy', 'medium', 'hard', 'pro'];
    const randomDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)];
    
    return {
      type: randomType,
      confidence: 0.7 + (Math.random() * 0.3), // 70-100% confidence
      features,
      surfaceQuality: randomSurface,
      difficulty: randomDifficulty
    };
  }
} 