export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export type Point = [number, number]; // [longitude, latitude]

export interface SpotFeatures {
  height?: number;
  width?: number;
  length?: number;
  angle?: number;
  steps?: number;
  [key: string]: any;
}

export type DifficultyRating = 'easy' | 'medium' | 'hard' | 'pro' | 'unknown';
export type SpotType = 'stairs' | 'rail' | 'ledge' | 'gap' | 'manual pad' | 'bowl' | 'ramp' | 'halfpipe' | 'plaza' | 'other' | 'unknown';
export type SurfaceType = 'concrete' | 'wood' | 'metal' | 'asphalt' | 'tile' | 'brick' | 'smooth' | 'rough' | 'cracked' | 'polished' | 'textured' | 'other' | 'unknown';
export type SkateabilityRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | number;
export type ImageAngle = 'main' | 'side' | 'front' | 'back' | 'top' | 'other';

export interface TechnicalDetails {
  roughness: number; // 1-10
  incline: number; // 1-10
  crowd_level: number; // 1-10
  [key: string]: any;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  skateability: SkateabilityRating;
  [key: string]: any;
}

export interface ForecastData extends WeatherData {
  date: string;
  time: string;
}

export interface SpotImage {
  id: string;
  spot_id: string;
  user_id: string;
  image_url: string;
  is_primary: boolean;
  angle: ImageAngle;
  created_at: string;
}

export interface SpotData {
  id?: string;
  user_id: string;
  name: string;
  type: SpotType;
  difficulty: DifficultyRating;
  coordinates?: Point;
  address?: string;
  surface?: SurfaceType;
  images?: string[];
  features?: SpotFeatures;
  skateability_score?: SkateabilityRating;
  technical_details?: TechnicalDetails;
  weather_data?: {
    best_time?: string;
    current?: WeatherData;
  };
  public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Spot {
  id: string;
  name: string;
  type: SpotType;
  features: SpotFeatures;
  location: GeoLocation;
  images: string[];
  skateability_score: number;
  difficulty: DifficultyRating;
  [key: string]: any;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  spot_id: string;
  user_id: string;
  rating: SkateabilityRating;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

export interface AnalysisResult {
  type?: SpotType;
  features?: SpotFeatures;
  surface?: SurfaceType;
  surfaceQuality?: string;
  difficulty?: DifficultyRating;
  confidence: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  type?: SpotType;
  difficulty?: DifficultyRating;
  surface?: SurfaceType;
  minSkateabilityScore?: SkateabilityRating;
  userId?: string;
  isPublic?: boolean;
  search?: string;
  nearLocation?: GeoLocation;
  radius?: number; // in kilometers
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export type ErrorResponse = {
  status: string;
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}; 