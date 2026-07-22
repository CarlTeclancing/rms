import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { applyStockDeductions, buildSaleRowsAndDeductions } from '../services/stock.service.js';

const menuInclude = { category: true };
const orderTransactionOptions = { maxWait: 10000, timeout: 20000 };

export const publicMenu = asyncHandler(async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    include: menuInclude,
    orderBy: { name: 'asc' }
  });
  res.json({ items });
});

export const createOnlineOrder = asyncHandler(async (req, res) => {
  const { items, deliveryFee = 0, latitude, longitude, ...customer } = req.body;
  if (!items?.length) throw new ApiError(422, 'At least one item is required');

  const order = await prisma.$transaction(
    async (tx) => {
      const { itemRows, deductions } = await buildSaleRowsAndDeductions(tx, items);
      const subtotal = itemRows.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal + Number(deliveryFee || 0);

      const created = await tx.onlineOrder.create({
        data: {
          orderNo: `WEB-${Date.now()}`,
          customerName: customer.customerName,
          customerPhone: customer.customerPhone,
          customerEmail: customer.customerEmail || null,
          deliveryAddress: customer.deliveryAddress,
          deliveryNote: customer.deliveryNote || null,
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
      return created;
    },
    orderTransactionOptions
  );

  res.status(201).json(order);
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
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ items: orders });
});

export const getPublicOnlineOrder = asyncHandler(async (req, res) => {
  const order = await prisma.onlineOrder.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { menuItem: true } } }
  });

  if (!order) throw new ApiError(404, 'Order not found');
  res.json(order);
});

export const updateOnlineOrderStatus = asyncHandler(async (req, res) => {
  const order = await prisma.onlineOrder.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
    include: { items: { include: { menuItem: true } } }
  });
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
