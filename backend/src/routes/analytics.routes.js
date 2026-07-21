import { Router } from 'express';
import { exportBusinessIntelligence, getBusinessIntelligence } from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/analytics/business-intelligence', authenticate, authorize('reports:read', 'dashboard:read'), getBusinessIntelligence);
router.get('/reports/business-intelligence/export', authenticate, authorize('reports:read', 'dashboard:read'), exportBusinessIntelligence);

export default router;
