import { WeatherService } from '../services/weather.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('WeatherService', () => {
  let weatherService: WeatherService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    weatherService = new WeatherService();
    jest.clearAllMocks();
  });

  describe('getWeatherForLocation', () => {
    it('fetches weather data successfully', async () => {
      const mockWeatherData = {
        current: {
          temperature: 22,
          condition: 'sunny',
          humidity: 65,
          wind_speed: 10
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData,
      } as Response);

      const result = await weatherService.getWeatherForLocation(40.7128, -74.0060);

      expect(result).toEqual(mockWeatherData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('weather')
      );
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(weatherService.getWeatherForLocation(0, 0))
        .rejects.toThrow('Weather API error');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(weatherService.getWeatherForLocation(40.7128, -74.0060))
        .rejects.toThrow('Network error');
    });

    it('validates latitude and longitude ranges', async () => {
      // Test invalid latitude
      await expect(weatherService.getWeatherForLocation(91, 0))
        .rejects.toThrow();

      await expect(weatherService.getWeatherForLocation(-91, 0))
        .rejects.toThrow();

      // Test invalid longitude
      await expect(weatherService.getWeatherForLocation(0, 181))
        .rejects.toThrow();

      await expect(weatherService.getWeatherForLocation(0, -181))
        .rejects.toThrow();
    });

    it('handles edge case coordinates', async () => {
      const mockWeatherData = { current: { temperature: 0 } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData,
      } as Response);

      // Test exact boundary values
      const result = await weatherService.getWeatherForLocation(90, 180);
      expect(result).toEqual(mockWeatherData);
    });
  });

  describe('getWeatherForecast', () => {
    it('fetches 5-day forecast successfully', async () => {
      const mockForecastData = {
        forecast: {
          forecastday: [
            { date: '2024-01-01', day: { condition: 'sunny', maxtemp_c: 25 } },
            { date: '2024-01-02', day: { condition: 'cloudy', maxtemp_c: 20 } }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastData,
      } as Response);

      const result = await weatherService.getWeatherForecast(40.7128, -74.0060, 5);

      expect(result).toEqual(mockForecastData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('forecast')
      );
    });

    it('defaults to 3-day forecast when days not specified', async () => {
      const mockForecastData = { forecast: { forecastday: [] } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastData,
      } as Response);

      await weatherService.getWeatherForecast(40.7128, -74.0060);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=3')
      );
    });

    it('limits forecast days to maximum allowed', async () => {
      const mockForecastData = { forecast: { forecastday: [] } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastData,
      } as Response);

      await weatherService.getWeatherForecast(40.7128, -74.0060, 20);

      // Should cap at 10 days (typical API limit)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=10')
      );
    });
  });
});
