import { Router } from 'express';
import { body } from 'express-validator';
import {
  createOnlineOrder,
  createDeliveryAgent,
  createMealReview,
  createReservation,
  getPublicOnlineOrder,
  listDeliveryAgents,
  listDriverDeliveryRequests,
  listMealReviews,
  listPublicCustomerOrders,
  listOnlineOrders,
  assignDeliveryAgentToOrder,
  acceptDriverDelivery,
  completeDriverDelivery,
  listReservations,
  publicMenu,
  updateDriverLocation,
  updatePublicCustomer,
  upsertPublicCustomer,
  updateOnlineOrderStatus,
  updateOnlineOrderTracking,
  updateReservationStatus
} from '../controllers/public.controller.js';
import { validate } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/public/menu', publicMenu);
router.get('/public/menu/:menuItemId/reviews', listMealReviews);
router.post(
  '/public/menu/:menuItemId/reviews',
  [
    body('customerName').notEmpty(),
    body('customerPhone').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    validate
  ],
  createMealReview
);
router.post('/public/customers/session', [body('name').notEmpty(), body('phone').notEmpty(), validate], upsertPublicCustomer);
router.put('/public/customers/:id', updatePublicCustomer);
router.get('/public/customers/:id/orders', listPublicCustomerOrders);
router.get('/public/orders/:id', getPublicOnlineOrder);
router.get('/public/drivers/:code/requests', listDriverDeliveryRequests);
router.post('/public/drivers/:code/orders/:id/accept', acceptDriverDelivery);
router.post('/public/drivers/:code/orders/:id/deliver', completeDriverDelivery);
router.put('/public/drivers/:code/orders/:id/location', updateDriverLocation);
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
router.put('/online-orders/:id/tracking', authenticate, authorize('sales:write'), updateOnlineOrderTracking);
router.get('/delivery-agents', authenticate, authorize('sales:read'), listDeliveryAgents);
router.post('/delivery-agents', authenticate, authorize('sales:write'), [body('name').notEmpty(), body('code').notEmpty(), validate], createDeliveryAgent);
router.put('/online-orders/:id/driver', authenticate, authorize('sales:write'), assignDeliveryAgentToOrder);
router.get('/reservations', authenticate, authorize('sales:read'), listReservations);
router.put('/reservations/:id/status', authenticate, authorize('sales:write'), body('status').notEmpty(), validate, updateReservationStatus);

export default router;
