import { Router } from 'express';
import { body } from 'express-validator';
import {
  createOnlineOrder,
  createReservation,
  listOnlineOrders,
  listReservations,
  publicMenu,
  updateOnlineOrderStatus,
  updateReservationStatus
} from '../controllers/public.controller.js';
import { validate } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/public/menu', publicMenu);
router.post(
  '/public/orders',
  [
    body('customerName').notEmpty(),
    body('customerPhone').notEmpty(),
    body('deliveryAddress').notEmpty(),
    body('items').isArray({ min: 1 }),
    validate
  ],
  createOnlineOrder
);
router.post(
  '/public/reservations',
  [
    body('customerName').notEmpty(),
    body('customerPhone').notEmpty(),
    body('partySize').isInt({ min: 1 }),
    body('reservationAt').isISO8601(),
    validate
  ],
  createReservation
);

router.get('/online-orders', authenticate, authorize('sales:read'), listOnlineOrders);
router.put('/online-orders/:id/status', authenticate, authorize('sales:write'), body('status').notEmpty(), validate, updateOnlineOrderStatus);
router.get('/reservations', authenticate, authorize('sales:read'), listReservations);
router.put('/reservations/:id/status', authenticate, authorize('sales:write'), body('status').notEmpty(), validate, updateReservationStatus);

export default router;
