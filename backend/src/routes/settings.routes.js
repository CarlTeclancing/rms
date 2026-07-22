import { Router } from 'express';
import { body } from 'express-validator';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

const settingsValidation = [
  body('restaurantName').optional().isString().trim().notEmpty(),
  body('shortName').optional().isString().trim().notEmpty(),
  body('currency').optional().isString().trim().isLength({ min: 3, max: 3 }),
  body('deliveryFee').optional().isFloat({ min: 0 }),
  body('publicOrdering').optional().isBoolean(),
  body('reservations').optional().isBoolean(),
  body('supportPhone').optional().isString().trim().notEmpty(),
  validate
];

router.get('/public/settings', getSettings);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, authorize('users:write'), settingsValidation, updateSettings);

export default router;
