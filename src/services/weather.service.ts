import axios from 'axios';
import { env } from '../config/env';
import { 
  GeoLocation, 
  WeatherData, 
  ForecastData, 
  SkateabilityRating 
} from '../types';
import logger from '../config/logger';
import { getCache, setCache } from '../config/cache';

/**
 * Service for weather-related operations
 */
export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.weatherapi.com/v1';
  private readonly cacheTTL: number = 60 * 60; // 1 hour

  constructor() {
    this.apiKey = env.WEATHER_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('Weather API key not provided. Weather features will be disabled.');
    }
  }

  /**
   * Get current weather data for a location
   * @param coordinates Geographic coordinates
   * @returns Current weather data
   */
  async getCurrentWeather(coordinates: GeoLocation): Promise<WeatherData> {
    if (!this.apiKey) {
      throw new Error('Weather API key not provided');
    }

    try {
      const { latitude, longitude } = coordinates;
      const query = `${latitude},${longitude}`;
      
      // Check cache first
      const cacheKey = `weather:current:${query}`;
      const cachedData = await getCache<WeatherData>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/current.json`, {
        params: {
          key: this.apiKey,
          q: query,
        },
      });
      
      const current = response.data.current;
      
      // Transform to our data model
      const weatherData: WeatherData = {
        temperature: current.temp_c,
        condition: current.condition.text,
        humidity: current.humidity,
        wind_speed: current.wind_kph,
        precipitation: current.precip_mm,
        skateability: this.calculateSkateability(current),
        is_day: current.is_day === 1,
        last_updated: current.last_updated,
        cloud: current.cloud,
        feels_like: current.feelslike_c,
        uv: current.uv,
        gust_kph: current.gust_kph,
        icon: current.condition.icon,
      };
      
      // Cache the data
      await setCache(cacheKey, weatherData, this.cacheTTL);
      
      return weatherData;
    } catch (error) {
      logger.error('Error fetching current weather:', error);
      throw new Error('Failed to fetch current weather data');
    }
  }

  /**
   * Get weather forecast for a location
   * @param coordinates Geographic coordinates
   * @param days Number of days (1-7)
   * @returns Weather forecast data
   */
  async getForecast(coordinates: GeoLocation, days: number = 3): Promise<ForecastData[]> {
    if (!this.apiKey) {
      throw new Error('Weather API key not provided');
    }

    try {
      const { latitude, longitude } = coordinates;
      const query = `${latitude},${longitude}`;
      const limitedDays = Math.min(Math.max(days, 1), 7); // Ensure between 1-7
      
      // Check cache first
      const cacheKey = `weather:forecast:${query}:${limitedDays}`;
      const cachedData = await getCache<ForecastData[]>(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/forecast.json`, {
        params: {
          key: this.apiKey,
          q: query,
          days: limitedDays,
          aqi: 'no',
          alerts: 'no',
        },
      });
      
      const forecastDays = response.data.forecast.forecastday;
      
      // Transform to our data model
      const forecastData: ForecastData[] = forecastDays.map((day: any) => {
        const dayData = day.day;
        
        return {
          date: day.date,
          temperature: dayData.avgtemp_c,
          condition: dayData.condition.text,
          humidity: dayData.avghumidity,
          wind_speed: dayData.maxwind_kph,
          precipitation: dayData.totalprecip_mm,
          skateability: this.calculateSkateability(dayData),
          min_temp: dayData.mintemp_c,
          max_temp: dayData.maxtemp_c,
          chance_of_rain: dayData.daily_chance_of_rain,
          chance_of_snow: dayData.daily_chance_of_snow,
          uv: dayData.uv,
          icon: dayData.condition.icon,
          time: '00:00', // Default for day forecast
          hourly_forecasts: day.hour.map((hour: any) => ({
            time: hour.time.split(' ')[1],
            temperature: hour.temp_c,
            condition: hour.condition.text,
            humidity: hour.humidity,
            wind_speed: hour.wind_kph,
            precipitation: hour.precip_mm,
            skateability: this.calculateSkateability(hour),
            is_day: hour.is_day === 1,
            feels_like: hour.feelslike_c,
            chance_of_rain: hour.chance_of_rain,
            chance_of_snow: hour.chance_of_snow,
            uv: hour.uv,
            icon: hour.condition.icon,
          })),
        };
      });
      
      // Cache the data
      await setCache(cacheKey, forecastData, this.cacheTTL);
      
      return forecastData;
    } catch (error) {
      logger.error('Error fetching weather forecast:', error);
      throw new Error('Failed to fetch weather forecast data');
    }
  }

  /**
   * Calculate skateability rating based on weather conditions
   * @param weatherData Weather data
   * @returns Skateability rating from 1-10
   */
  getSkateabilityByWeather(weatherData: WeatherData): SkateabilityRating {
    return this.calculateSkateability(weatherData);
  }

  /**
   * Determine the best time to skate based on weather forecast
   * @param location Geographic coordinates
   * @returns String describing the best time to skate
   */
  async getBestTimeToSkate(location: GeoLocation): Promise<string> {
    try {
      // Get 3-day forecast with hourly data
      const forecast = await this.getForecast(location, 3);
      
      if (!forecast.length) {
        return 'No forecast data available';
      }
      
      let bestTime: string = '';
      let highestRating: number = 0;
      
      // Analyze each day's hourly forecast
      forecast.forEach(day => {
        day.hourly_forecasts.forEach((hour: any) => {
          // Only consider daytime hours (8am-8pm)
          const hourNum = parseInt(hour.time.split(':')[0]);
          if (hourNum >= 8 && hourNum <= 20) {
            // Check if this hour has better skating conditions
            if (hour.skateability > highestRating) {
              highestRating = hour.skateability;
              bestTime = `${day.date} at ${hour.time}`;
            }
          }
        });
      });
      
      if (bestTime) {
        return `Best time to skate: ${bestTime}`;
      } else {
        return 'No optimal skating time found in the forecast';
      }
    } catch (error) {
      logger.error('Error determining best time to skate:', error);
      return 'Unable to determine the best time to skate';
    }
  }

  /**
   * Get weather data for a specific spot
   * @param spotId Spot ID
   * @param coordinates Spot coordinates
   * @returns Combined weather data for the spot
   */
  async getSpotWeather(
    spotId: string, 
    coordinates: GeoLocation
  ): Promise<{
    current: WeatherData;
    forecast: ForecastData[];
    best_time: string;
  }> {
    try {
      // Get current weather
      const current = await this.getCurrentWeather(coordinates);
      
      // Get 3-day forecast
      const forecast = await this.getForecast(coordinates, 3);
      
      // Determine best time to skate
      const bestTime = await this.getBestTimeToSkate(coordinates);
      
      return {
        current,
        forecast,
        best_time: bestTime,
      };
    } catch (error) {
      logger.error(`Error getting weather for spot ${spotId}:`, error);
      throw new Error('Failed to get weather data for spot');
    }
  }

  /**
   * Calculate skateability rating based on weather parameters
   * @param data Weather data
   * @returns Skateability rating from 1-10
   * @private
   */
  private calculateSkateability(data: any): SkateabilityRating {
    // Start with a perfect score
    let score = 10;
    
    // Analyze weather condition text
    const conditionLower = data.condition?.text.toLowerCase() || '';
    
    // Poor conditions that make skating difficult/dangerous
    if (
      conditionLower.includes('rain') || 
      conditionLower.includes('snow') || 
      conditionLower.includes('sleet') || 
      conditionLower.includes('ice') || 
      conditionLower.includes('thunder') ||
      conditionLower.includes('storm')
    ) {
      score -= 8; // Almost impossible to skate
    } else if (
      conditionLower.includes('drizzle') || 
      conditionLower.includes('mist') || 
      conditionLower.includes('fog')
    ) {
      score -= 4; // Difficult but possible
    } else if (conditionLower.includes('cloudy')) {
      score -= 1; // Slightly less ideal
    }
    
    // Temperature factors (in Celsius)
    const temp = data.temp_c || data.avgtemp_c || 20;
    if (temp < 0) {
      score -= 5; // Too cold
    } else if (temp < 5) {
      score -= 3; // Very cold
    } else if (temp < 10) {
      score -= 1; // Chilly
    } else if (temp > 35) {
      score -= 3; // Too hot
    } else if (temp > 30) {
      score -= 1; // Hot
    }
    
    // Precipitation
    const precip = data.precip_mm || data.totalprecip_mm || 0;
    if (precip > 5) {
      score -= 6;
    } else if (precip > 2) {
      score -= 4;
    } else if (precip > 0.5) {
      score -= 2;
    }
    
    // Wind speed (kph)
    const wind = data.wind_kph || data.maxwind_kph || 0;
    if (wind > 40) {
      score -= 5; // Very windy
    } else if (wind > 25) {
      score -= 3; // Quite windy
    } else if (wind > 15) {
      score -= 1; // Breezy
    }
    
    // Ensure score is between 1-10
    score = Math.max(1, Math.min(10, Math.round(score))) as SkateabilityRating;
    
    return score;
  }
}

// Export singleton instance
export const weatherService = new WeatherService(); 