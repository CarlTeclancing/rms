import { Router } from 'express';
import { body } from 'express-validator';
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuItem,
  listIngredients,
  listMenuCategories,
  listMenuItems,
  updateMenuItem
} from '../controllers/menu.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.get('/menu-items', authenticate, listMenuItems);
router.post(
  '/menu-items',
  authenticate,
  authorize('menu:write'),
  [body('name').notEmpty(), body('price').isFloat({ min: 0 }), body('categoryId').notEmpty(), validate],
  createMenuItem
);
router.put('/menu-items/:id', authenticate, authorize('menu:write'), updateMenuItem);
router.delete('/menu-items/:id', authenticate, authorize('menu:write'), deleteMenuItem);
router.get('/menu-categories', authenticate, listMenuCategories);
router.post('/menu-categories', authenticate, authorize('menu:write'), [body('name').notEmpty(), validate], createMenuCategory);
router.get('/ingredients', authenticate, listIngredients);

export default router;
