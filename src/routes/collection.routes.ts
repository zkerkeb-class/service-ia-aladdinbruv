import { Router } from 'express';
import { collectionController } from '../controllers/collection.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', collectionController.getCollections);
router.get('/users/:userId/collections', collectionController.getCollectionsByUser);
router.get('/users/:userId/achievements', collectionController.getAchievementsByUser);

export default router; 