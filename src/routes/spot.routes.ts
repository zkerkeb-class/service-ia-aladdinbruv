import { Router } from 'express';
import { spotController } from '../controllers/spot.controller';
import { uploadImage } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /api/spots/public:
 *   get:
 *     summary: Get public skateboarding spots
 *     description: Retrieve a list of public skateboarding spots
 *     tags: [Spots]
 *     responses:
 *       200:
 *         description: List of public spots
 *       500:
 *         description: Server error
 */
router.get('/public', spotController.getSpotRecommendations);

// Apply authentication middleware to all routes below
router.use(authenticate);

/**
 * @swagger
 * /api/spots/analyze:
 *   post:
 *     summary: Analyze a skateboarding spot image
 *     description: Upload and analyze a skateboarding spot image to extract features
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: The spot image to analyze
 *     responses:
 *       200:
 *         description: Successful analysis
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/analyze', 
  uploadImage, 
  spotController.analyzeSpotImage
);

/**
 * @swagger
 * /api/spots/recommendations:
 *   post:
 *     summary: Get spot recommendations
 *     description: Get personalized skateboarding spot recommendations based on user preferences
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - preferences
 *               - location
 *             properties:
 *               userId:
 *                 type: string
 *               preferences:
 *                 type: object
 *               location:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful recommendations
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/recommendations', 
  validate([
    body('userId').isString().notEmpty(),
    body('preferences').isObject().notEmpty(),
    body('location').isObject().notEmpty()
  ]), 
  spotController.getSpotRecommendations
);

/**
 * @swagger
 * /api/spots/recommendations:
 *   get:
 *     summary: Get spot recommendations
 *     description: Get personalized skateboarding spot recommendations
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful recommendations
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/recommendations', spotController.getSpotRecommendations);

/**
 * @swagger
 * /api/spots/difficulty:
 *   post:
 *     summary: Rate spot difficulty
 *     description: Analyze and rate the difficulty of a skateboarding spot
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePath
 *             properties:
 *               imagePath:
 *                 type: string
 *               spotFeatures:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful rating
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/difficulty', 
  validate([
    body('imagePath').isString().notEmpty()
  ]), 
  spotController.rateDifficulty
);

/**
 * @swagger
 * /api/spots/type:
 *   post:
 *     summary: Detect spot type
 *     description: Detect the type of skateboarding spot from an image
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePath
 *             properties:
 *               imagePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful detection
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/type', 
  validate([
    body('imagePath').isString().notEmpty()
  ]), 
  spotController.detectSpotType
);

/**
 * @swagger
 * /api/spots/obstacle:
 *   post:
 *     summary: Measure spot obstacle
 *     description: Measure the dimensions of a skateboarding spot obstacle
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePath
 *               - obstacleType
 *             properties:
 *               imagePath:
 *                 type: string
 *               obstacleType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful measurement
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/obstacle', 
  validate([
    body('imagePath').isString().notEmpty(),
    body('obstacleType').isString().notEmpty()
  ]), 
  spotController.measureObstacle
);

/**
 * @swagger
 * /api/spots/surface:
 *   post:
 *     summary: Analyze spot surface
 *     description: Analyze the surface quality of a skateboarding spot
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePath
 *             properties:
 *               imagePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful analysis
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/surface', 
  validate([
    body('imagePath').isString().notEmpty()
  ]), 
  spotController.analyzeSurface
);

export default router; 