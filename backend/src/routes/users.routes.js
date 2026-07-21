import { Router } from 'express';
import { body } from 'express-validator';
import { createRole, createUser, deleteUser, listRoles, listUsers, updateUser } from '../controllers/users.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.get('/users', authenticate, authorize('users:write'), listUsers);
router.post('/users', authenticate, authorize('users:write'), [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 }), body('roleId').notEmpty(), validate], createUser);
router.put('/users/:id', authenticate, authorize('users:write'), updateUser);
router.delete('/users/:id', authenticate, authorize('users:write'), deleteUser);
router.get('/roles', authenticate, authorize('users:write'), listRoles);
router.post('/roles', authenticate, authorize('users:write'), [body('name').notEmpty(), body('permissions').isArray(), validate], createRole);

export default router;
