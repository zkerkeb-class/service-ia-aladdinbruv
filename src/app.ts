import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { StatusCodes } from 'http-status-codes';
import { env } from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import weatherRoutes from './routes/weather.routes';
import spotRoutes from './routes/spot.routes';
import homeRoutes from './routes/home.routes';
import collectionRoutes from './routes/collection.routes';

const app = express();

// Apply middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // During development allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// API routes
app.use('/api/spots', spotRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/collections', collectionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'ok', service: 'sk8-spot-analyzer-service' });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app; 