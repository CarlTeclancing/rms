import { Router } from 'express';
import { expensesReport, salesReport } from '../controllers/reports.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('reports:read'));
router.get('/reports/sales', salesReport);
router.get('/reports/expenses', expensesReport);

export default router;
