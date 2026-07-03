import { Router } from 'express';
import { body } from 'express-validator';
import { login, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.post('/login', [body('email').isEmail(), body('password').notEmpty(), validate], login);
router.get('/me', authenticate, me);

export default router;
