import { Router } from 'express';
import { uploadAppImage, uploadPromotionImage, uploadReceipt } from '../controllers/upload.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/upload/receipt', authenticate, authorize('expenses:write'), upload.single('receipt'), uploadReceipt);
router.post('/upload/image', authenticate, upload.single('image'), uploadAppImage);
router.post('/public/upload/promotion-image', upload.single('image'), uploadPromotionImage);

export default router;
