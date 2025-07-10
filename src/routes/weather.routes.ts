import { Router } from 'express';
import { weatherController } from '../controllers/weather.controller';
import { validate } from '../middleware/validation.middleware';
import { query } from 'express-validator';

const router = Router();

router.get(
    '/current',
    validate([
        query('lat').isFloat(),
        query('lon').isFloat(),
    ]),
    weatherController.getCurrentWeather
);

export default router;