import { Router } from 'express';
import { body } from 'express-validator';
import {
  createStockItem,
  createStockMovement,
  deleteStockItem,
  listStockMovements,
  listStockItems,
  listSuppliers,
  updateStockItem
} from '../controllers/stock.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.get('/stock-items', authenticate, listStockItems);
router.post('/stock-items', authenticate, authorize('stock:write'), [body('name').notEmpty(), body('unit').notEmpty(), validate], createStockItem);
router.put('/stock-items/:id', authenticate, authorize('stock:write'), updateStockItem);
router.delete('/stock-items/:id', authenticate, authorize('stock:write'), deleteStockItem);
router.post(
  '/stock-movements',
  authenticate,
  authorize('stock:write'),
  [body('stockItemId').notEmpty(), body('type').isIn(['IN', 'OUT', 'ADJUSTMENT']), body('quantity').isFloat({ min: 0.001 }), validate],
  createStockMovement
);
router.get('/stock-movements', authenticate, listStockMovements);
router.get('/suppliers', authenticate, listSuppliers);

export default router;
