import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { applyStockDeductions, buildSaleRowsAndDeductions } from '../services/stock.service.js';

const menuInclude = { category: true };
const orderTransactionOptions = { maxWait: 10000, timeout: 20000 };
const cleanPhone = (phone = '') => String(phone).replace(/\s+/g, '').trim();

const serializeCustomer = (customer, orderCount = 0) => ({
  ...customer,
  orderCount
});

export const publicMenu = asyncHandler(async (_req, res) => {
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    include: menuInclude,
    orderBy: { name: 'asc' }
  });
  res.json({ items });
});

export const createOnlineOrder = asyncHandler(async (req, res) => {
  const { items, deliveryFee = 0, latitude, longitude, customerId, ...customer } = req.body;
  if (!items?.length) throw new ApiError(422, 'At least one item is required');

  const order = await prisma.$transaction(
    async (tx) => {
      const phone = cleanPhone(customer.customerPhone);
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
          address: customer.deliveryAddress || null
        }
      });
      const { itemRows, deductions } = await buildSaleRowsAndDeductions(tx, items);
      const subtotal = itemRows.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal + Number(deliveryFee || 0);

      const created = await tx.onlineOrder.create({
        data: {
          orderNo: `WEB-${Date.now()}`,
          customerId: customerId || orderCustomer.id,
          customerName: customer.customerName,
          customerPhone: phone,
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

export const upsertPublicCustomer = asyncHandler(async (req, res) => {
  const phone = cleanPhone(req.body.phone);
  if (!phone) throw new ApiError(422, 'Phone number is required');

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: {
      name: req.body.name,
      email: req.body.email || undefined,
      address: req.body.address || undefined
    },
    create: {
      name: req.body.name,
      phone,
      email: req.body.email || null,
      address: req.body.address || null
    }
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
    data
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
    include: { items: { include: { menuItem: true } } },
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
