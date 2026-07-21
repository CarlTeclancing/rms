import { Router } from 'express';
import { body } from 'express-validator';
import {
  createExpense,
  deleteExpense,
  listExpenseCategories,
  listExpenses,
  updateExpense
} from '../controllers/expenses.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.get('/expenses', authenticate, authorize('expenses:read'), listExpenses);
router.post('/expenses', authenticate, authorize('expenses:write'), [body('title').notEmpty(), body('amount').isFloat({ min: 0 }), body('categoryId').notEmpty(), validate], createExpense);
router.put('/expenses/:id', authenticate, authorize('expenses:write'), updateExpense);
router.delete('/expenses/:id', authenticate, authorize('expenses:write'), deleteExpense);
router.get('/expense-categories', authenticate, listExpenseCategories);

export default router;
