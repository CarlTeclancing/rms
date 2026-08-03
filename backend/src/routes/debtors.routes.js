import { Router } from 'express';
import { body } from 'express-validator';
import { createDebtor, deleteDebtor, listDebtors, updateDebtor } from '../controllers/debtors.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

const debtorValidation = [
  body('customerName').notEmpty(),
  body('description').notEmpty(),
  body('amount').isFloat({ min: 0 }),
  body('amountPaid').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']),
  validate
];

router.get('/debtors', authenticate, authorize('debtors:read'), listDebtors);
router.post('/debtors', authenticate, authorize('debtors:write'), debtorValidation, createDebtor);
router.put('/debtors/:id', authenticate, authorize('debtors:write'), updateDebtor);
router.delete('/debtors/:id', authenticate, authorize('debtors:write'), deleteDebtor);

export default router;
