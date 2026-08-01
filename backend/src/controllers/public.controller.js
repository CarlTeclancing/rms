import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { applyStockDeductions, buildSaleRowsAndDeductions } from '../services/stock.service.js';

const menuInclude = { category: true };
const orderTransactionOptions = { maxWait: 10000, timeout: 20000 };
const cleanPhone = (phone = '') => String(phone).replace(/\s+/g, '').trim();
const cleanReferralCode = (code = '') => String(code).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 24);

const serializeCustomer = (customer, orderCount = 0) => ({
  ...customer,
  orderCount,
  referralCount: customer._count?.referrals || customer.referralCount || 0
});

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
          customerId: customerId || orderCustomer.id,
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
      if (pointsEarned > 0) {
        await tx.customer.update({
          where: { id: customerId || orderCustomer.id },
          data: { points: { increment: pointsEarned } }
        });
      }
      return created;
    },
    orderTransactionOptions
  );

  res.status(201).json({ ...order, pointsEarned });
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
