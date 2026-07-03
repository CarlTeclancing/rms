import { Router } from 'express';
import { body } from 'express-validator';
import { createRole, createUser, deleteUser, listRoles, listUsers, updateUser } from '../controllers/users.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/errorHandler.js';

const router = Router();

router.use(authenticate, authorize('users:write'));
router.get('/users', listUsers);
router.post('/users', [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 }), body('roleId').notEmpty(), validate], createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/roles', listRoles);
router.post('/roles', [body('name').notEmpty(), body('permissions').isArray(), validate], createRole);

export default router;
