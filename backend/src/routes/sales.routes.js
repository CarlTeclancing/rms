import { Router } from 'express';
import { body } from 'express-validator';
import { createSale, listSales } from '../controllers/sales.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.get('/sales', authenticate, authorize('sales:read'), listSales);
router.post('/sales', authenticate, authorize('sales:write'), [body('items').isArray({ min: 1 }), validate], createSale);

export default router;
