import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { WeatherService } from '../services/weather.service';
import logger from '../config/logger';

class WeatherController {
  private weatherService: WeatherService;

  constructor() {
    this.weatherService = new WeatherService();
  }

  public getCurrentWeather = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Missing latitude or longitude query parameters'
        });
      }
      const coordinates = {
        latitude: parseFloat(lat as string),
        longitude: parseFloat(lon as string),
      };
      const weatherData = await this.weatherService.getCurrentWeather(coordinates);
      return res.status(StatusCodes.OK).json(weatherData);
    } catch (error) {
      logger.error('Error in WeatherController:', error);
      next(error);
    }
  };
}

export const weatherController = new WeatherController();