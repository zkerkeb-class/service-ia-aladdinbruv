import { env } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SK8 Spot Analyzer API',
    version: '1.0.0',
    description: 'API documentation for the SK8 Spot Analyzer Service',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'SK8 Spot API Support',
      url: 'https://github.com/aladdinbruv/sk8-spot-analyzer-service',
      email: 'support@sk8spot.com',
    },
  },
  servers: [
    {
      url: `http://${env.HOST}:${env.PORT}/api/${env.API_VERSION}`,
      description: 'Development server',
    },
    {
      url: 'https://api.sk8spot.com/api/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Spot: {
        type: 'object',
        required: ['name', 'type', 'difficulty'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'The auto-generated UUID of the spot',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'The UUID of the user who created the spot',
          },
          name: {
            type: 'string',
            description: 'The name of the skateboarding spot',
          },
          type: {
            type: 'string',
            enum: ['stairs', 'rail', 'ledge', 'gap', 'manual pad', 'bowl', 'ramp', 'halfpipe', 'plaza', 'other'],
            description: 'The type of skateboarding spot',
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard', 'pro'],
            description: 'The difficulty level of the spot',
          },
          coordinates: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            description: 'Geographic coordinates of the spot',
          },
          address: {
            type: 'string',
            description: 'Physical address of the spot',
          },
          surface: {
            type: 'string',
            enum: ['concrete', 'wood', 'metal', 'asphalt', 'tile', 'brick', 'other'],
            description: 'The surface material of the spot',
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri',
            },
            description: 'URLs of images of the spot',
          },
          features: {
            type: 'object',
            properties: {
              height: { type: 'number' },
              width: { type: 'number' },
              length: { type: 'number' },
              angle: { type: 'number' },
            },
            description: 'Physical measurements of the spot features',
          },
          skateability_score: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'Overall skateability score from 1-10',
          },
          technical_details: {
            type: 'object',
            properties: {
              roughness: { 
                type: 'integer',
                minimum: 1,
                maximum: 10
              },
              incline: { 
                type: 'integer',
                minimum: 1,
                maximum: 10
              },
              crowd_level: { 
                type: 'integer',
                minimum: 1,
                maximum: 10
              },
            },
            description: 'Technical details of the spot',
          },
          weather_data: {
            type: 'object',
            properties: {
              best_time: { type: 'string' },
              current: { type: 'object' },
            },
            description: 'Weather-related data for the spot',
          },
          public: {
            type: 'boolean',
            description: 'Whether the spot is publicly visible',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the spot was created',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the spot was last updated',
          }
        },
      },
      
      Collection: {
        type: 'object',
        required: ['name', 'user_id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'The auto-generated UUID of the collection',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'The UUID of the user who created the collection',
          },
          name: {
            type: 'string',
            description: 'The name of the collection',
          },
          description: {
            type: 'string',
            description: 'A description of the collection',
          },
          icon: {
            type: 'string',
            description: 'Icon identifier for the collection',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the collection was created',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the collection was last updated',
          }
        },
      },
      
      Review: {
        type: 'object',
        required: ['spot_id', 'user_id', 'rating'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'The auto-generated UUID of the review',
          },
          spot_id: {
            type: 'string',
            format: 'uuid',
            description: 'The UUID of the spot being reviewed',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'The UUID of the user who created the review',
          },
          rating: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'Rating from 1-10',
          },
          comment: {
            type: 'string',
            description: 'User comment on the spot',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the review was created',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the review was last updated',
          }
        },
      },
      
      SpotImage: {
        type: 'object',
        required: ['spot_id', 'user_id', 'image_url'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'The auto-generated UUID of the image',
          },
          spot_id: {
            type: 'string',
            format: 'uuid',
            description: 'The UUID of the spot',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'The UUID of the user who uploaded the image',
          },
          image_url: {
            type: 'string',
            format: 'uri',
            description: 'URL of the image',
          },
          is_primary: {
            type: 'boolean',
            description: 'Whether this is the primary image for the spot',
          },
          angle: {
            type: 'string',
            enum: ['main', 'side', 'front', 'back', 'top', 'other'],
            description: 'The viewing angle of the image',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'When the image was uploaded',
          }
        },
      },
      
      WeatherData: {
        type: 'object',
        properties: {
          temperature: {
            type: 'number',
            description: 'Current temperature in Celsius',
          },
          condition: {
            type: 'string',
            description: 'Weather condition (e.g., sunny, rainy)',
          },
          humidity: {
            type: 'number',
            description: 'Humidity percentage',
          },
          wind_speed: {
            type: 'number',
            description: 'Wind speed in km/h',
          },
          precipitation: {
            type: 'number',
            description: 'Precipitation amount in mm',
          },
          skateability: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Skateability rating based on weather conditions',
          }
        },
      },
      
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
          },
          statusCode: {
            type: 'integer',
          },
          message: {
            type: 'string',
          },
          error: {
            type: 'string',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          path: {
            type: 'string',
          }
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

export default swaggerDefinition; 