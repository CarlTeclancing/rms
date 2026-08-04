import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { applyStockDeductions, buildSaleRowsAndDeductions } from '../services/stock.service.js';
import { emitOrderUpdate } from '../services/realtime.service.js';

const menuInclude = {
  category: true,
  reviews: {
    orderBy: { createdAt: 'desc' },
    take: 3
  },
  _count: { select: { reviews: true } }
};
const orderTransactionOptions = { maxWait: 10000, timeout: 20000 };
const cleanPhone = (phone = '') => String(phone).replace(/\s+/g, '').trim();
const cleanReferralCode = (code = '') => String(code).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 24);
const cleanAgentCode = (code = '') => String(code).replace(/[^a-z0-9-]/gi, '').toUpperCase().slice(0, 24);
const deliveryStatusCopy = {
  PENDING: ['Order received', 'Your order has been received.'],
  ACCEPTED: ['Restaurant accepted', 'The restaurant accepted your order.'],
  PREPARING: ['Restaurant preparing', 'Your meal is being prepared.'],
  READY: ['Meal ready', 'Your meal is ready for pickup.'],
  DRIVER_ASSIGNED: ['Driver assigned', 'A driver has been assigned to your order.'],
  DRIVER_TO_RESTAURANT: ['Driver going to restaurant', 'Your driver is heading to the restaurant.'],
  DRIVER_ARRIVED: ['Driver arrived', 'Your driver has arrived at the restaurant.'],
  PICKED_UP: ['Meal picked up', 'Your driver picked up the meal.'],
  OUT_FOR_DELIVERY: ['Driver on the way', 'Your order is on the way.'],
  DRIVER_NEARBY: ['Driver nearby', 'Your driver is nearby.'],
  DELIVERED: ['Delivered', 'Your order has been delivered.'],
  CANCELLED: ['Order cancelled', 'Your order was cancelled.']
};

const trackingInclude = {
  items: { include: { menuItem: true } },
  deliveryAgent: true,
  trackingEvents: { orderBy: { createdAt: 'asc' } },
  notifications: { orderBy: { createdAt: 'desc' }, take: 20 }
};

const statusCopy = (status) => deliveryStatusCopy[status] || [String(status || 'PENDING').replaceAll('_', ' '), 'Order status updated.'];

const createOrderTrackingEvent = async (tx, order, status, options = {}) => {
  const [title, defaultMessage] = statusCopy(status);
  await tx.deliveryTrackingEvent.create({
    data: {
      onlineOrderId: order.id,
      status,
      title,
      message: options.message || defaultMessage,
      latitude: options.latitude === undefined || options.latitude === '' ? null : Number(options.latitude),
      longitude: options.longitude === undefined || options.longitude === '' ? null : Number(options.longitude),
      etaMinutes: options.etaMinutes === undefined || options.etaMinutes === '' ? null : Number(options.etaMinutes),
      distanceKm: options.distanceKm === undefined || options.distanceKm === '' ? null : Number(options.distanceKm),
      metadata: options.metadata || {}
    }
  });
  await tx.notification.create({
    data: {
      onlineOrderId: order.id,
      customerId: order.customerId || null,
      category: 'ORDERS',
      channel: 'IN_APP',
      title,
      body: options.message || defaultMessage,
      deepLink: `order:${order.id}`,
      deliveredAt: new Date(),
      metadata: { status, orderNo: order.orderNo }
    }
  });
};

const orderWithTracking = (tx, id) => tx.onlineOrder.findUnique({ where: { id }, include: trackingInclude });

const driverAssignmentStatuses = new Set(['PENDING', 'ACCEPTED', 'PREPARING', 'READY']);

const findDeliveryAgent = async (tx, lookup) => {
  const value = String(lookup || '').trim();
  if (!value) return null;
  const normalizedCode = cleanAgentCode(value);
  return tx.deliveryAgent.findFirst({
    where: {
      OR: [
        { id: value },
        ...(normalizedCode ? [{ code: normalizedCode }] : []),
        { name: { contains: value, mode: 'insensitive' } },
        { phone: { contains: value, mode: 'insensitive' } }
      ]
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }]
  });
};

const driverSnapshot = (agent) => ({
  deliveryAgentId: agent.id,
  driverName: agent.name,
  driverPhone: agent.phone || null,
  driverPhotoUrl: agent.photoUrl || null,
  vehicleInfo: agent.vehicleInfo || null,
  driverLatitude: agent.latitude || null,
  driverLongitude: agent.longitude || null,
  driverHeading: agent.heading || null,
  driverSpeedKph: agent.speedKph || null,
  trackingUpdatedAt: new Date()
});

const driverCommissionFor = (order) => Number((Number(order.deliveryFee || 0) * 0.5).toFixed(2));

const serializeCustomer = (customer, orderCount = 0) => ({
  ...customer,
  orderCount,
  referralCount: customer._count?.referrals || customer.referralCount || 0
});

const reviewSummary = (reviews = [], count = reviews.length) => {
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;
  return {
    averageRating: Number(averageRating.toFixed(1)),
    reviewCount: count
  };
};

const serializeMenuItem = (item, summaryOverride) => {
  const reviews = item.reviews || [];
  const summary = summaryOverride || reviewSummary(reviews, item._count?.reviews || reviews.length);
  return {
    ...item,
    reviews,
    averageRating: summary.averageRating,
    reviewCount: summary.reviewCount,
    _count: undefined
  };
};

const baseReferralCode = (name = '', phone = '') => {
  const base = `${name}${phone}`.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);
  return base || 'CHOPASAP';
};

const createReferralCode = async (tx, name, phone) => {
  const base = baseReferralCode(name, phone);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = cleanReferralCode(`${base}${suffix}`);
    const existing = await tx.customer.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return cleanReferralCode(`${base}${Date.now().toString(36).toUpperCase()}`);
};

export const publicMenu = asyncHandler(async (_req, res) => {
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { isAvailable: true },
      include: menuInclude,
      orderBy: { name: 'asc' }
    }),
    prisma.menuCategory.findMany({ orderBy: { name: 'asc' } })
  ]);

  const reviewStats = items.length
    ? await prisma.mealReview.groupBy({
        by: ['menuItemId'],
        where: { menuItemId: { in: items.map((item) => item.id) } },
        _avg: { rating: true },
        _count: { _all: true }
      })
    : [];
  const summaryByItemId = new Map(reviewStats.map((entry) => [
    entry.menuItemId,
    {
      averageRating: Number(Number(entry._avg.rating || 0).toFixed(1)),
      reviewCount: entry._count._all
    }
  ]));

  res.json({ items: items.map((item) => serializeMenuItem(item, summaryByItemId.get(item.id))), categories });
});

export const listMealReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.mealReview.findMany({
    where: { menuItemId: req.params.menuItemId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ items: reviews, ...reviewSummary(reviews, reviews.length) });
});

export const createMealReview = asyncHandler(async (req, res) => {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(422, 'Rating must be between 1 and 5');
  }

  const menuItem = await prisma.menuItem.findUnique({ where: { id: req.params.menuItemId } });
  if (!menuItem) throw new ApiError(404, 'Menu item not found');

  const reviewerPhone = cleanPhone(req.body.customerPhone || '');
  if (!reviewerPhone) throw new ApiError(422, 'Phone number is required to review an ordered meal');

  const orderedMeal = await prisma.onlineOrder.findFirst({
    where: {
      customerPhone: reviewerPhone,
      items: { some: { menuItemId: req.params.menuItemId } }
    },
    select: { id: true }
  });
  if (!orderedMeal) throw new ApiError(403, 'Only customers who ordered this meal can review it');

  const review = await prisma.mealReview.create({
    data: {
      menuItemId: req.params.menuItemId,
      customerName: req.body.customerName,
      customerPhone: reviewerPhone,
      rating,
      comment: req.body.comment || null
    }
  });
  res.status(201).json(review);
});

export const createOnlineOrder = asyncHandler(async (req, res) => {
  const { items, deliveryFee = 0, latitude, longitude, customerId, ...customer } = req.body;
  if (!items?.length) throw new ApiError(422, 'At least one item is required');
  let pointsEarned = 0;

  const order = await prisma.$transaction(
    async (tx) => {
      const phone = cleanPhone(customer.customerPhone);
      const referralCode = await createReferralCode(tx, customer.customerName, phone);
      const orderCustomer = await tx.customer.upsert({
        where: { phone },
        update: {
          name: customer.customerName,
          email: customer.customerEmail || undefined,
          address: customer.deliveryAddress || undefined
        },
        create: {
          name: customer.customerName,
          phone,
          email: customer.customerEmail || null,
          address: customer.deliveryAddress || null,
          referralCode
        }
      });
      const { itemRows, deductions } = await buildSaleRowsAndDeductions(tx, items);
      const subtotal = itemRows.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal + Number(deliveryFee || 0);
      pointsEarned = itemRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0) * 2;

      const created = await tx.onlineOrder.create({
        data: {
          orderNo: `WEB-${Date.now()}`,
          customerId: orderCustomer.id,
          customerName: customer.customerName,
          customerPhone: phone,
          customerEmail: customer.customerEmail || null,
          deliveryAddress: customer.deliveryAddress,
          deliveryNote: customer.deliveryNote || null,
          isGift: Boolean(customer.isGift),
          recipientName: customer.isGift ? customer.recipientName || null : null,
          recipientPhone: customer.isGift ? cleanPhone(customer.recipientPhone) || null : null,
          recipientAddress: customer.isGift ? customer.recipientAddress || null : null,
          latitude: latitude === undefined || latitude === '' ? null : Number(latitude),
          longitude: longitude === undefined || longitude === '' ? null : Number(longitude),
          subtotal,
          deliveryFee: Number(deliveryFee || 0),
          total,
          items: {
            create: itemRows.map((row) => ({
              menuItemId: row.menuItem.id,
              variationName: row.variationName,
              quantity: row.quantity,
              unitPrice: row.unitPrice,
              total: row.total
            }))
          }
        },
        include: { items: { include: { menuItem: true } } }
      });

      await applyStockDeductions(tx, deductions, `Online order ${created.orderNo}`);
      await createOrderTrackingEvent(tx, created, 'PENDING');
      if (pointsEarned > 0) {
        await tx.customer.update({
          where: { id: orderCustomer.id },
          data: { points: { increment: pointsEarned } }
        });
      }
      const updatedCustomer = await tx.customer.findUnique({
        where: { id: orderCustomer.id },
        include: { _count: { select: { referrals: true } } }
      });
      const orderCount = await tx.onlineOrder.count({
        where: { OR: [{ customerId: updatedCustomer.id }, { customerPhone: updatedCustomer.phone }] }
      });
      return { order: created, customer: serializeCustomer(updatedCustomer, orderCount) };
    },
    orderTransactionOptions
  );

  const responseOrder = { ...order.order, pointsEarned, customer: order.customer };
  emitOrderUpdate(responseOrder);
  res.status(201).json(responseOrder);
});

export const upsertPublicCustomer = asyncHandler(async (req, res) => {
  const phone = cleanPhone(req.body.phone);
  if (!phone) throw new ApiError(422, 'Phone number is required');
  const referralCode = cleanReferralCode(req.body.referralCode || req.body.ref);

  const customer = await prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findUnique({ where: { phone } });
    if (existing) {
      return tx.customer.update({
        where: { id: existing.id },
        data: {
          name: req.body.name,
          email: req.body.email || undefined,
          address: req.body.address || undefined
        },
        include: { _count: { select: { referrals: true } } }
      });
    }

    const referrer = referralCode
      ? await tx.customer.findUnique({ where: { referralCode } })
      : null;
    const ownReferralCode = await createReferralCode(tx, req.body.name, phone);
    const created = await tx.customer.create({
      data: {
        name: req.body.name,
        phone,
        email: req.body.email || null,
        address: req.body.address || null,
        referralCode: ownReferralCode,
        referredById: referrer && referrer.phone !== phone ? referrer.id : null,
        points: referrer && referrer.phone !== phone ? 10 : 0
      },
      include: { _count: { select: { referrals: true } } }
    });

    if (referrer && referrer.phone !== phone) {
      await tx.customer.update({
        where: { id: referrer.id },
        data: { points: { increment: 10 } }
      });
    }

    return created;
  });
  const orderCount = await prisma.onlineOrder.count({
    where: { OR: [{ customerId: customer.id }, { customerPhone: customer.phone }] }
  });
  res.json(serializeCustomer(customer, orderCount));
});

export const updatePublicCustomer = asyncHandler(async (req, res) => {
  const data = {};
  for (const key of ['name', 'email', 'address', 'profileImageUrl']) {
    if (req.body[key] !== undefined) data[key] = req.body[key] || null;
  }
  if (req.body.phone !== undefined) data.phone = cleanPhone(req.body.phone);

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data,
    include: { _count: { select: { referrals: true } } }
  });
  const orderCount = await prisma.onlineOrder.count({
    where: { OR: [{ customerId: customer.id }, { customerPhone: customer.phone }] }
  });
  res.json(serializeCustomer(customer, orderCount));
});

export const listPublicCustomerOrders = asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const orders = await prisma.onlineOrder.findMany({
    where: { OR: [{ customerId: customer.id }, { customerPhone: customer.phone }] },
    include: trackingInclude,
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ items: orders });
});

export const createReservation = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.create({
    data: {
      reservationNo: `RSV-${Date.now()}`,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      customerEmail: req.body.customerEmail || null,
      partySize: Number(req.body.partySize),
      mealPreference: req.body.mealPreference || null,
      reservationAt: new Date(req.body.reservationAt),
      note: req.body.note || null
    }
  });
  res.status(201).json(reservation);
});

export const listOnlineOrders = asyncHandler(async (_req, res) => {
  const orders = await prisma.onlineOrder.findMany({
    include: trackingInclude,
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ items: orders });
});

export const getPublicOnlineOrder = asyncHandler(async (req, res) => {
  const order = await prisma.onlineOrder.findUnique({
    where: { id: req.params.id },
    include: trackingInclude
  });

  if (!order) throw new ApiError(404, 'Order not found');
  res.json(order);
});

export const updateOnlineOrderStatus = asyncHandler(async (req, res) => {
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.onlineOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: trackingInclude
    });
    await createOrderTrackingEvent(tx, updated, req.body.status, {
      message: req.body.message,
      etaMinutes: req.body.etaMinutes,
      distanceKm: req.body.distanceKm
    });
    return tx.onlineOrder.findUnique({ where: { id: req.params.id }, include: trackingInclude });
  });
  emitOrderUpdate(order);
  res.json(order);
});

export const updateOnlineOrderTracking = asyncHandler(async (req, res) => {
  const data = {
    ...(req.body.driverName !== undefined ? { driverName: req.body.driverName || null } : {}),
    ...(req.body.driverPhone !== undefined ? { driverPhone: req.body.driverPhone || null } : {}),
    ...(req.body.driverPhotoUrl !== undefined ? { driverPhotoUrl: req.body.driverPhotoUrl || null } : {}),
    ...(req.body.vehicleInfo !== undefined ? { vehicleInfo: req.body.vehicleInfo || null } : {}),
    ...(req.body.latitude !== undefined ? { driverLatitude: req.body.latitude === '' ? null : Number(req.body.latitude) } : {}),
    ...(req.body.longitude !== undefined ? { driverLongitude: req.body.longitude === '' ? null : Number(req.body.longitude) } : {}),
    ...(req.body.heading !== undefined ? { driverHeading: req.body.heading === '' ? null : Number(req.body.heading) } : {}),
    ...(req.body.speedKph !== undefined ? { driverSpeedKph: req.body.speedKph === '' ? null : Number(req.body.speedKph) } : {}),
    ...(req.body.etaMinutes !== undefined ? { etaMinutes: req.body.etaMinutes === '' ? null : Number(req.body.etaMinutes) } : {}),
    ...(req.body.distanceKm !== undefined ? { distanceKm: req.body.distanceKm === '' ? null : Number(req.body.distanceKm) } : {}),
    trackingUpdatedAt: new Date()
  };
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.onlineOrder.update({
      where: { id: req.params.id },
      data,
      include: trackingInclude
    });
    await createOrderTrackingEvent(tx, updated, updated.status, {
      message: req.body.message || 'Driver location updated.',
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      etaMinutes: req.body.etaMinutes,
      distanceKm: req.body.distanceKm,
      metadata: { tracking: true, speedKph: req.body.speedKph, heading: req.body.heading }
    });
    return tx.onlineOrder.findUnique({ where: { id: req.params.id }, include: trackingInclude });
  });
  emitOrderUpdate(order);
  res.json(order);
});

export const listDeliveryAgents = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const agents = await prisma.deliveryAgent.findMany({
    where: search
      ? {
          OR: [
            { code: { contains: cleanAgentCode(search), mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        }
      : undefined,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    take: 100
  });
  res.json({ items: agents });
});

export const createDeliveryAgent = asyncHandler(async (req, res) => {
  const code = cleanAgentCode(req.body.code || req.body.name);
  if (!code) throw new ApiError(422, 'Delivery agent code is required');

  const agent = await prisma.deliveryAgent.create({
    data: {
      code,
      name: req.body.name,
      phone: req.body.phone || null,
      photoUrl: req.body.photoUrl || null,
      vehicleInfo: req.body.vehicleInfo || null,
      status: req.body.status || 'ONLINE'
    }
  });
  res.status(201).json(agent);
});

export const assignDeliveryAgentToOrder = asyncHandler(async (req, res) => {
  const lookup = req.body.deliveryAgentId || req.body.code || req.body.lookup || req.body.name;
  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.onlineOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Order not found');
    if (['DELIVERED', 'CANCELLED'].includes(existing.status)) {
      throw new ApiError(422, 'Delivered or cancelled orders cannot be assigned to a driver');
    }

    const agent = await findDeliveryAgent(tx, lookup);
    if (!agent) throw new ApiError(404, 'Delivery agent not found. Use the exact driver code or search by name.');

    const nextStatus = driverAssignmentStatuses.has(existing.status) ? 'DRIVER_ASSIGNED' : existing.status;
    const updated = await tx.onlineOrder.update({
      where: { id: existing.id },
      data: {
        ...driverSnapshot(agent),
        status: nextStatus
      },
      include: trackingInclude
    });
    await tx.deliveryAgent.update({
      where: { id: agent.id },
      data: { status: 'BUSY', lastSeenAt: new Date() }
    });
    await createOrderTrackingEvent(tx, updated, nextStatus, {
      message: `${agent.name} has been assigned to deliver this order.`,
      metadata: { deliveryAgentId: agent.id, deliveryAgentCode: agent.code }
    });
    return orderWithTracking(tx, existing.id);
  }, orderTransactionOptions);

  emitOrderUpdate(order);
  res.json(order);
});

export const listDriverDeliveryRequests = asyncHandler(async (req, res) => {
  const code = cleanAgentCode(req.params.code);
  const agent = await prisma.deliveryAgent.findUnique({ where: { code } });
  if (!agent) throw new ApiError(404, 'Delivery agent not found');

  await prisma.deliveryAgent.update({
    where: { id: agent.id },
    data: { status: agent.status === 'OFFLINE' ? 'ONLINE' : agent.status, lastSeenAt: new Date() }
  });

  const orders = await prisma.onlineOrder.findMany({
    where: {
      deliveryAgentId: agent.id,
      status: { notIn: ['DELIVERED', 'CANCELLED'] }
    },
    include: trackingInclude,
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({ agent: { ...agent, status: agent.status === 'OFFLINE' ? 'ONLINE' : agent.status }, items: orders });
});

export const acceptDriverDelivery = asyncHandler(async (req, res) => {
  const code = cleanAgentCode(req.params.code);
  const order = await prisma.$transaction(async (tx) => {
    const agent = await tx.deliveryAgent.findUnique({ where: { code } });
    if (!agent) throw new ApiError(404, 'Delivery agent not found');
    const existing = await tx.onlineOrder.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deliveryAgentId !== agent.id) throw new ApiError(404, 'Assigned delivery request not found');
    if (['DELIVERED', 'CANCELLED'].includes(existing.status)) throw new ApiError(422, 'This delivery is already closed');

    const updated = await tx.onlineOrder.update({
      where: { id: existing.id },
      data: {
        ...driverSnapshot(agent),
        status: 'DRIVER_TO_RESTAURANT',
        driverAcceptedAt: new Date()
      },
      include: trackingInclude
    });
    await tx.deliveryAgent.update({
      where: { id: agent.id },
      data: { status: 'DELIVERING', lastSeenAt: new Date() }
    });
    await createOrderTrackingEvent(tx, updated, 'DRIVER_TO_RESTAURANT', {
      message: `${agent.name} accepted the delivery request and is heading to the restaurant.`,
      metadata: { deliveryAgentId: agent.id, deliveryAgentCode: agent.code }
    });
    return orderWithTracking(tx, existing.id);
  }, orderTransactionOptions);

  emitOrderUpdate(order);
  res.json(order);
});

export const completeDriverDelivery = asyncHandler(async (req, res) => {
  const code = cleanAgentCode(req.params.code);
  const order = await prisma.$transaction(async (tx) => {
    const agent = await tx.deliveryAgent.findUnique({ where: { code } });
    if (!agent) throw new ApiError(404, 'Delivery agent not found');
    const existing = await tx.onlineOrder.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deliveryAgentId !== agent.id) throw new ApiError(404, 'Assigned delivery request not found');
    if (existing.status === 'CANCELLED') throw new ApiError(422, 'Cancelled orders cannot be delivered');

    const commission = driverCommissionFor(existing);
    const updated = await tx.onlineOrder.update({
      where: { id: existing.id },
      data: {
        status: 'DELIVERED',
        driverDeliveredAt: new Date(),
        driverCommission: commission,
        trackingUpdatedAt: new Date()
      },
      include: trackingInclude
    });
    await tx.deliveryAgent.update({
      where: { id: agent.id },
      data: { status: 'ONLINE', lastSeenAt: new Date() }
    });
    await createOrderTrackingEvent(tx, updated, 'DELIVERED', {
      message: `${agent.name} marked the order as delivered. Driver commission: ${commission}.`,
      metadata: { deliveryAgentId: agent.id, deliveryAgentCode: agent.code, driverCommission: commission }
    });
    return orderWithTracking(tx, existing.id);
  }, orderTransactionOptions);

  emitOrderUpdate(order);
  res.json(order);
});

export const updateDriverLocation = asyncHandler(async (req, res) => {
  const code = cleanAgentCode(req.params.code);
  const order = await prisma.$transaction(async (tx) => {
    const agent = await tx.deliveryAgent.findUnique({ where: { code } });
    if (!agent) throw new ApiError(404, 'Delivery agent not found');
    const existing = await tx.onlineOrder.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deliveryAgentId !== agent.id) throw new ApiError(404, 'Assigned delivery request not found');

    const locationData = {
      ...(req.body.latitude !== undefined ? { latitude: req.body.latitude === '' ? null : Number(req.body.latitude) } : {}),
      ...(req.body.longitude !== undefined ? { longitude: req.body.longitude === '' ? null : Number(req.body.longitude) } : {}),
      ...(req.body.heading !== undefined ? { heading: req.body.heading === '' ? null : Number(req.body.heading) } : {}),
      ...(req.body.speedKph !== undefined ? { speedKph: req.body.speedKph === '' ? null : Number(req.body.speedKph) } : {}),
      lastSeenAt: new Date()
    };
    await tx.deliveryAgent.update({ where: { id: agent.id }, data: locationData });
    const updated = await tx.onlineOrder.update({
      where: { id: existing.id },
      data: {
        ...(req.body.latitude !== undefined ? { driverLatitude: req.body.latitude === '' ? null : Number(req.body.latitude) } : {}),
        ...(req.body.longitude !== undefined ? { driverLongitude: req.body.longitude === '' ? null : Number(req.body.longitude) } : {}),
        ...(req.body.heading !== undefined ? { driverHeading: req.body.heading === '' ? null : Number(req.body.heading) } : {}),
        ...(req.body.speedKph !== undefined ? { driverSpeedKph: req.body.speedKph === '' ? null : Number(req.body.speedKph) } : {}),
        ...(req.body.etaMinutes !== undefined ? { etaMinutes: req.body.etaMinutes === '' ? null : Number(req.body.etaMinutes) } : {}),
        ...(req.body.distanceKm !== undefined ? { distanceKm: req.body.distanceKm === '' ? null : Number(req.body.distanceKm) } : {}),
        trackingUpdatedAt: new Date()
      },
      include: trackingInclude
    });
    await createOrderTrackingEvent(tx, updated, updated.status, {
      message: req.body.message || 'Driver location updated.',
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      etaMinutes: req.body.etaMinutes,
      distanceKm: req.body.distanceKm,
      metadata: { deliveryAgentId: agent.id, deliveryAgentCode: agent.code, tracking: true }
    });
    return orderWithTracking(tx, existing.id);
  }, orderTransactionOptions);

  emitOrderUpdate(order);
  res.json(order);
});

export const listReservations = asyncHandler(async (_req, res) => {
  const reservations = await prisma.reservation.findMany({ orderBy: { reservationAt: 'asc' }, take: 100 });
  res.json({ items: reservations });
});

export const updateReservationStatus = asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.update({
    where: { id: req.params.id },
    data: { status: req.body.status }
  });
  res.json(reservation);
});
