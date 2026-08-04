import { Router } from 'express';
import { body } from 'express-validator';
import {
  createMarketingItem,
  claimPublicReward,
  deleteMarketingItem,
  exportMarketingReport,
  listMarketingItems,
  marketingDashboard,
  publicMarketingItems,
  updateMarketingItem
} from '../controllers/marketing.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

const validation = [
  body('type').notEmpty(),
  body('title').notEmpty(),
  validate
];

router.get('/public/marketing', publicMarketingItems);
router.post('/public/marketing/:id/claim', claimPublicReward);
router.get('/marketing/dashboard', authenticate, authorize('marketing:read'), marketingDashboard);
router.get('/marketing/items', authenticate, authorize('marketing:read'), listMarketingItems);
router.post('/marketing/items', authenticate, authorize('marketing:write'), validation, createMarketingItem);
router.put('/marketing/items/:id', authenticate, authorize('marketing:write'), validation, updateMarketingItem);
router.delete('/marketing/items/:id', authenticate, authorize('marketing:write'), deleteMarketingItem);
router.get('/marketing/reports/export', authenticate, authorize('marketing:read'), exportMarketingReport);

export default router;
