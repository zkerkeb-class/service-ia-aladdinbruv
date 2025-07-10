import { Router } from 'express';
import { homeController } from '../controllers/home.controller';

const router = Router();

router.get(
  '/trick-of-the-day', 
  homeController.getTrickOfTheDay
);

router.get(
  '/daily-challenges',
  homeController.getDailyChallenges
);

export default router; 