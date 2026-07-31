import { Router } from 'express';
import { body } from 'express-validator';
import {
  createFlashSaleCode,
  createPromotion,
  deleteFlashSaleCode,
  deletePromotion,
  getPublicFlashSaleCode,
  listFlashSaleCodes,
  listPromotions,
  listPublicPromotions,
  submitPromotionRequest,
  updateFlashSaleCode,
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
router.get('/public/flash-sale', getPublicFlashSaleCode);

router.get('/promotions', authenticate, authorize('promotions:read', 'menu:write', 'reports:read'), listPromotions);
router.post('/promotions', authenticate, authorize('promotions:write', 'menu:write'), promotionValidation, createPromotion);
router.put('/promotions/:id', authenticate, authorize('promotions:write', 'menu:write'), updatePromotion);
router.delete('/promotions/:id', authenticate, authorize('promotions:write', 'menu:write'), deletePromotion);
router.get('/flash-sale-codes', authenticate, authorize('promotions:read', 'menu:write', 'reports:read'), listFlashSaleCodes);
router.post(
  '/flash-sale-codes',
  authenticate,
  authorize('promotions:write', 'menu:write'),
  [body('code').notEmpty(), body('title').notEmpty(), body('discountPercent').optional().isInt({ min: 1, max: 100 }), validate],
  createFlashSaleCode
);
router.put('/flash-sale-codes/:id', authenticate, authorize('promotions:write', 'menu:write'), updateFlashSaleCode);
router.delete('/flash-sale-codes/:id', authenticate, authorize('promotions:write', 'menu:write'), deleteFlashSaleCode);

export default router;
