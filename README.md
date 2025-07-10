# SK8 Spot AI Service 🛹🤖

A powerful AI-driven microservice for analyzing, discovering, and managing skateboarding spots. This service provides intelligent spot analysis, geospatial search, weather integration, and comprehensive spot management capabilities for skateboarding applications.

## 🌟 Features

### 🤖 AI-Powered Spot Analysis
- **Computer Vision Analysis**: Analyzes skateboarding spot photos using Roboflow API and fallback ML services
- **Automatic Spot Classification**: Identifies spot types (stairs, rails, ledges, bowls, halfpipes, etc.)
- **Difficulty Assessment**: AI-powered difficulty rating (easy, medium, hard, pro)
- **Surface Quality Detection**: Analyzes surface conditions (concrete, wood, metal, etc.)
- **Feature Extraction**: Detects obstacles, measurements, and skateable features
- **Trick Recommendations**: Suggests appropriate tricks for each spot type

### 🗺️ Spot Management
- **CRUD Operations**: Complete spot lifecycle management
- **Geospatial Search**: PostGIS-powered location-based queries
- **Advanced Filtering**: Filter by type, difficulty, surface, skateability score
- **Spot Verification**: Admin verification system for quality control
- **Image Management**: Multiple photos per spot with primary image selection
- **User Collections**: Personal spot collections and favorites

### 🌤️ Weather & Location Services
- **Weather Integration**: Real-time weather conditions for spot locations
- **Geographic Queries**: Find spots within specified radius
- **Address Resolution**: Location-based spot discovery
- **Nearby Recommendations**: Intelligent spot suggestions based on user location

### 👤 User Features
- **Authentication**: JWT-based user authentication middleware
- **Personal Collections**: Save and organize favorite spots
- **Achievements System**: Track user skateboarding achievements
- **Daily Content**: "Trick of the Day" and daily challenges
- **Personalized Recommendations**: AI-driven spot suggestions based on user preferences

### 🔧 Technical Features
- **Caching Layer**: Redis-powered performance optimization
- **File Upload**: Secure image upload handling
- **Email Notifications**: Automated analysis completion notifications
- **Rate Limiting**: API protection and usage control
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Robust error management and logging

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SK8 Spot AI Service                     │
├─────────────────────────────────────────────────────────────┤
│                     Controllers                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Spot     │ │   Weather   │ │ Collection  │          │
│  │ Controller  │ │ Controller  │ │ Controller  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                      Services                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ AI Analysis │ │   Storage   │ │   Weather   │          │
│  │   Service   │ │   Service   │ │   Service   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Supabase   │ │    Redis    │ │   File      │          │
│  │ (PostgreSQL)│ │   Cache     │ │  Storage    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Docker and Docker Compose (optional)
- Supabase account
- Redis instance

### Installation

#### Using npm
```bash
# Clone the repository
git clone https://github.com/zkerkeb-class/service-ia-aladdinbruv.git
cd service-ia-aladdinbruv

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

#### Using Docker
```bash
# Start with Docker Compose
docker-compose up

# Stop services
docker-compose down

# Build and start
docker-compose up --build
```

## ⚙️ Environment Configuration

Create a `.env` file in the project root:

```env
# Server Configuration
NODE_ENV=development
PORT=3002
HOST=localhost
API_VERSION=v1
CORS_ORIGIN=*

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
JWT_SECRET=your_jwt_secret
TOKEN_EXPIRES_IN=1d
AUTH_SERVICE_URL=http://localhost:3001/api/v1

# AI/ML Configuration
ML_SERVICE_URL=http://localhost:5000
ROBOFLOW_API_KEY=your_roboflow_api_key
ROBOFLOW_MODEL_ID=your_roboflow_model_id
ROBOFLOW_VERSION_NUMBER=1

# External APIs
WEATHER_API_KEY=your_openweather_api_key
OPENCAGE_API_KEY=your_opencage_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Storage
STORAGE_BUCKET=sk8-spot-images
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log
```

## 🗄️ Database Setup

The service uses Supabase (PostgreSQL) with the following main tables:

### Core Tables
- `spots` - Main skateboarding spots with PostGIS location data
- `spot_images` - Associated spot photos and metadata
- `collections` - User spot collections and favorites
- `tricks` - Skateboarding tricks database
- `daily_challenges` - Daily skateboarding challenges

### Setup Instructions
1. Create a Supabase project
2. Run the database migrations (see `SETUP_SUPABASE.md`)
3. Enable Row Level Security (RLS) policies
4. Configure authentication settings

Detailed setup guide: [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)

## 📚 API Documentation

### Base URL
```
http://localhost:3002/api
```

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Main Endpoints

#### 🛹 Spot Analysis
```http
POST /spots/analyze
Content-Type: multipart/form-data

# Upload and analyze a spot image
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "image=@spot.jpg" \
  http://localhost:3002/api/spots/analyze
```

#### 🔍 Spot Search
```http
GET /spots?latitude=40.7128&longitude=-74.0060&radius=5000&type=stairs&limit=20
```

#### 🆕 Create Spot
```http
POST /spots
Content-Type: application/json

{
  "name": "Epic Stair Set",
  "description": "15-stair with perfect run-up",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "type": "stairs",
  "difficulty": "hard",
  "surface": "concrete",
  "skateability_score": 8
}
```

#### 🌤️ Weather Data
```http
GET /weather/current?lat=40.7128&lon=-74.0060
```

#### 📁 User Collections
```http
GET /collections
Authorization: Bearer <token>
```

#### 🎯 Daily Content
```http
GET /home/trick-of-the-day
GET /home/challenges
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional message"
}
```

### Error Handling
Error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Error details (development only)"
}
```

## 🤖 AI Analysis Features

### Supported Spot Types
- **Stairs**: Stair sets of various sizes
- **Rails**: Handrails, ledges with rails
- **Ledges**: Grindable ledges and barriers
- **Gaps**: Jump gaps and distances
- **Manual Pads**: Manual pad obstacles
- **Bowls**: Skateable bowls and pools
- **Ramps**: Quarter pipes and launch ramps
- **Halfpipes**: Vert ramps and halfpipes
- **Plaza**: Plaza-style street spots

### Analysis Output
```json
{
  "type": "stairs",
  "confidence": 0.95,
  "difficulty": "hard",
  "skateabilityScore": 8,
  "surfaceQuality": "concrete",
  "features": {
    "stepCount": 15,
    "height": "2.5m",
    "runUp": "good",
    "landingSpace": "excellent"
  },
  "suggestedTricks": [
    "kickflip",
    "heelflip",
    "tre flip",
    "backside flip"
  ]
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test spot.controller.test.ts
```

## 📊 Performance & Monitoring

### Caching Strategy
- **Spot Data**: 1 hour TTL
- **Weather Data**: 30 minutes TTL
- **User Collections**: 15 minutes TTL
- **Static Data**: 24 hours TTL

### Logging
The service uses structured logging with the following levels:
- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug messages

### Health Check
```http
GET /health
```

## 🔒 Security Features

- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable origin restrictions
- **File Upload Security**: File type and size validation
- **Authentication Middleware**: JWT token validation

## 🚀 Deployment

### Docker Deployment
```bash
# Build production image
docker build -t sk8-spot-ai-service:latest .

# Run container
docker run -p 3002:3002 --env-file .env sk8-spot-ai-service:latest
```

### Environment-Specific Configurations

#### Development
- Detailed error messages
- Debug logging enabled
- CORS: Allow all origins
- Rate limiting: Relaxed

#### Production
- Error messages sanitized
- Info-level logging
- CORS: Specific origins only
- Rate limiting: Strict

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update API documentation
- Follow conventional commit messages
- Ensure all tests pass

## 📋 API Response Examples

### Spot Analysis Response
```json
{
  "success": true,
  "data": {
    "type": "stairs",
    "confidence": 0.95,
    "difficulty": "hard",
    "skateabilityScore": 8,
    "surfaceQuality": "concrete",
    "features": {
      "stepCount": 15,
      "height": "2.5m",
      "runUp": "good"
    },
    "suggestedTricks": ["kickflip", "heelflip"]
  }
}
```

### Spot Search Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Epic Stair Set",
      "type": "stairs",
      "difficulty": "hard",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "skateabilityScore": 8,
      "verified": true,
      "distance": 0.5
    }
  ]
}
```

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL) with PostGIS
- **Caching**: Redis
- **Authentication**: JWT
- **AI/ML**: Roboflow API
- **File Upload**: Multer
- **Validation**: express-validator
- **Testing**: Jest
- **Containerization**: Docker
- **API Documentation**: Swagger/OpenAPI

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@sk8app.com or create an issue in the GitHub repository.

## 🗺️ Roadmap

- [ ] Enhanced AI models for better spot recognition
- [ ] Real-time spot condition updates
- [ ] Social features (spot ratings, reviews)
- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] Machine learning model training pipeline
- [ ] Multi-language support
- [ ] Offline functionality

---

Made with ❤️ for the skateboarding community 🛹
