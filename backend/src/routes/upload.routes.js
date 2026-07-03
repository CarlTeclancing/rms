import { Router } from 'express';
import { uploadReceipt } from '../controllers/upload.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/upload/receipt', authenticate, authorize('expenses:write'), upload.single('receipt'), uploadReceipt);

export default router;
