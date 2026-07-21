import { Router } from 'express';
import { expensesReport, salesReport } from '../controllers/reports.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/reports/sales', authenticate, authorize('reports:read'), salesReport);
router.get('/reports/expenses', authenticate, authorize('reports:read'), expensesReport);

export default router;
