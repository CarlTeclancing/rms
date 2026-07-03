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

router.use(authenticate);
router.get('/stock-items', listStockItems);
router.post('/stock-items', authorize('stock:write'), [body('name').notEmpty(), body('unit').notEmpty(), validate], createStockItem);
router.put('/stock-items/:id', authorize('stock:write'), updateStockItem);
router.delete('/stock-items/:id', authorize('stock:write'), deleteStockItem);
router.post(
  '/stock-movements',
  authorize('stock:write'),
  [body('stockItemId').notEmpty(), body('type').isIn(['IN', 'OUT', 'ADJUSTMENT']), body('quantity').isFloat({ min: 0.001 }), validate],
  createStockMovement
);
router.get('/stock-movements', listStockMovements);
router.get('/suppliers', listSuppliers);

export default router;
