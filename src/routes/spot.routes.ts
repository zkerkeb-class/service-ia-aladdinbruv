import { Router } from 'express';
import { spotController } from '../controllers/spot.controller';
import { uploadImage } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, query } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /api/weather/current:
 *   get:
 *     summary: Get current weather for a location
 *     description: Retrieve current weather data using latitude and longitude
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *     responses:
 *       200:
 *         description: Current weather data
 *       400:
 *         description: Missing or invalid coordinates
 */


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

/**
 * @swagger
 * /api/spots:
 *   get:
 *     summary: Get skateboarding spots
 *     description: Retrieve a list of skateboarding spots with optional filtering
 *     tags: [Spots]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in meters
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by spot type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Limit number of results
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *     responses:
 *       200:
 *         description: List of spots
 *       500:
 *         description: Server error
 */
router.get('/', spotController.getSpots);

/**
 * @swagger
 * /api/spots:
 *   post:
 *     summary: Create a new skateboarding spot
 *     description: Create a new skateboarding spot with location and details
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
 *               - name
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the spot
 *               description:
 *                 type: string
 *                 description: Description of the spot
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               type:
 *                 type: string
 *                 enum: [stairs, rail, ledge, gap, manual pad, bowl, ramp, halfpipe, plaza, other, unknown]
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, pro, unknown]
 *               surface:
 *                 type: string
 *                 enum: [concrete, wood, metal, asphalt, tile, brick, smooth, rough, cracked, polished, textured, other, unknown]
 *               features:
 *                 type: object
 *               skateability_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Spot created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticate,  // Add authentication middleware
  validate([
    body('name').isString().notEmpty().withMessage('Name is required'),
    // Accept both nested location object and flat latitude/longitude
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('location.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('location.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    body('type').optional().isIn(['stairs', 'rail', 'ledge', 'gap', 'manual pad', 'bowl', 'ramp', 'halfpipe', 'plaza', 'other', 'unknown']),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'pro', 'unknown']),
    body('surface').optional().isIn(['concrete', 'wood', 'metal', 'asphalt', 'tile', 'brick', 'smooth', 'rough', 'cracked', 'polished', 'textured', 'other', 'unknown']),
    body('skateability_score').optional().isFloat({ min: 0, max: 10 })
  ]),
  spotController.createSpot
);

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

/**
 * @swagger
 * /api/spots/collections:
 *   get:
 *     summary: Get collections
 *     description: Get a list of spot collections
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of collections
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/collections', async (req, res) => {
  try {
    // This is a temporary implementation until you create a proper one
    // Return an empty array directly, not nested under data property
    return res.status(200).json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching collections'
    });
  }
});

/**
 * @swagger
 * /api/spots/users/{userId}/spots:
 *   get:
 *     summary: Get spots by user
 *     description: Retrieve all spots created by a specific user.
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user.
 *     responses:
 *       200:
 *         description: A list of spots.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/users/:userId/spots', spotController.getSpotsByUser);

export default router; 