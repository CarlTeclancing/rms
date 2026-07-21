import { Router } from 'express';
import { body } from 'express-validator';
import {
  createPromotion,
  deletePromotion,
  listPromotions,
  listPublicPromotions,
  submitPromotionRequest,
  updatePromotion
} from '../controllers/promotions.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

const promotionValidation = [
  body('businessName').notEmpty(),
  body('contactName').notEmpty(),
  body('contactPhone').notEmpty(),
  body('title').notEmpty(),
  body('description').notEmpty(),
  validate
];

router.get('/public/promotions', listPublicPromotions);
router.post('/public/promotions', promotionValidation, submitPromotionRequest);

router.get('/promotions', authenticate, authorize('promotions:read', 'menu:write', 'reports:read'), listPromotions);
router.post('/promotions', authenticate, authorize('promotions:write', 'menu:write'), promotionValidation, createPromotion);
router.put('/promotions/:id', authenticate, authorize('promotions:write', 'menu:write'), updatePromotion);
router.delete('/promotions/:id', authenticate, authorize('promotions:write', 'menu:write'), deletePromotion);

export default router;
