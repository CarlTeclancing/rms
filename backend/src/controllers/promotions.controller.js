import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

const serializePromotion = (promotion) => ({
  ...promotion,
  startsAt: promotion.startsAt?.toISOString?.() || promotion.startsAt,
  endsAt: promotion.endsAt?.toISOString?.() || promotion.endsAt,
  approvedAt: promotion.approvedAt?.toISOString?.() || promotion.approvedAt
});

const serializeFlashSaleCode = (code) => ({
  ...code,
  startsAt: code.startsAt?.toISOString?.() || code.startsAt,
  endsAt: code.endsAt?.toISOString?.() || code.endsAt
});

const dateOrNull = (value, options = {}) => {
  if (!value) return null;
  const date = new Date(value);
  if (options.endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};
const cleanCode = (value = '') => value.trim().toUpperCase().replace(/\s+/g, '');

export const listPublicPromotions = asyncHandler(async (_req, res) => {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      status: 'APPROVED',
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    },
    orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
    take: 6
  });
  res.json({ items: promotions.map(serializePromotion) });
});

export const submitPromotionRequest = asyncHandler(async (req, res) => {
  const promotion = await prisma.promotion.create({
    data: {
      businessName: req.body.businessName,
      contactName: req.body.contactName,
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail || null,
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl || null,
      ctaLabel: req.body.ctaLabel || 'Contact our Team',
      ctaUrl: req.body.ctaUrl || null,
      placement: req.body.placement || 'PORTAL_HOME'
    }
  });
  res.status(201).json(serializePromotion(promotion));
});

export const listPromotions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = {
    ...(req.query.status ? { status: req.query.status } : {}),
    ...(req.query.search
      ? {
          OR: [
            { businessName: { contains: req.query.search, mode: 'insensitive' } },
            { title: { contains: req.query.search, mode: 'insensitive' } },
            { contactName: { contains: req.query.search, mode: 'insensitive' } }
          ]
        }
      : {})
  };
  const [items, total] = await Promise.all([
    prisma.promotion.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.promotion.count({ where })
  ]);
  res.json(paginatedResponse(items.map(serializePromotion), total, page, limit));
});

export const createPromotion = asyncHandler(async (req, res) => {
  const promotion = await prisma.promotion.create({
    data: {
      businessName: req.body.businessName,
      contactName: req.body.contactName,
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail || null,
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl || null,
      ctaLabel: req.body.ctaLabel || 'Contact our Team',
      ctaUrl: req.body.ctaUrl || null,
      placement: req.body.placement || 'PORTAL_HOME',
      status: req.body.status || 'APPROVED',
      startsAt: dateOrNull(req.body.startsAt),
      endsAt: dateOrNull(req.body.endsAt, { endOfDay: true }),
      approvedAt: (req.body.status || 'APPROVED') === 'APPROVED' ? new Date() : null,
      adminNote: req.body.adminNote || null
    }
  });
  res.status(201).json(serializePromotion(promotion));
});

export const updatePromotion = asyncHandler(async (req, res) => {
  const data = {
    ...req.body,
    ...(req.body.startsAt !== undefined ? { startsAt: dateOrNull(req.body.startsAt) } : {}),
    ...(req.body.endsAt !== undefined ? { endsAt: dateOrNull(req.body.endsAt, { endOfDay: true }) } : {})
  };
  if (req.body.status === 'APPROVED') data.approvedAt = new Date();
  const promotion = await prisma.promotion.update({ where: { id: req.params.id }, data });
  res.json(serializePromotion(promotion));
});

export const deletePromotion = asyncHandler(async (req, res) => {
  await prisma.promotion.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const getPublicFlashSaleCode = asyncHandler(async (_req, res) => {
  const now = new Date();
  const codes = await prisma.flashSaleCode.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    },
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    take: 10
  });
  const code = codes.find((item) => item.maxRedemptions === null || item.redeemedCount < item.maxRedemptions);

  res.json({ item: code ? serializeFlashSaleCode(code) : null });
});

export const listFlashSaleCodes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = {
    ...(req.query.search ? { code: { contains: req.query.search, mode: 'insensitive' } } : {}),
    ...(req.query.active === 'true' ? { isActive: true } : {}),
    ...(req.query.active === 'false' ? { isActive: false } : {})
  };
  const [items, total] = await Promise.all([
    prisma.flashSaleCode.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.flashSaleCode.count({ where })
  ]);
  res.json(paginatedResponse(items.map(serializeFlashSaleCode), total, page, limit));
});

export const createFlashSaleCode = asyncHandler(async (req, res) => {
  const code = await prisma.flashSaleCode.create({
    data: {
      code: cleanCode(req.body.code),
      title: req.body.title,
      description: req.body.description || null,
      discountPercent: Number(req.body.discountPercent || 10),
      isActive: req.body.isActive ?? true,
      startsAt: dateOrNull(req.body.startsAt),
      endsAt: dateOrNull(req.body.endsAt, { endOfDay: true }),
      maxRedemptions: req.body.maxRedemptions === '' || req.body.maxRedemptions === undefined ? null : Number(req.body.maxRedemptions)
    }
  });
  res.status(201).json(serializeFlashSaleCode(code));
});

export const updateFlashSaleCode = asyncHandler(async (req, res) => {
  const data = {
    ...req.body,
    ...(req.body.code !== undefined ? { code: cleanCode(req.body.code) } : {}),
    ...(req.body.discountPercent !== undefined ? { discountPercent: Number(req.body.discountPercent || 10) } : {}),
    ...(req.body.startsAt !== undefined ? { startsAt: dateOrNull(req.body.startsAt) } : {}),
    ...(req.body.endsAt !== undefined ? { endsAt: dateOrNull(req.body.endsAt, { endOfDay: true }) } : {}),
    ...(req.body.maxRedemptions !== undefined ? { maxRedemptions: req.body.maxRedemptions === '' ? null : Number(req.body.maxRedemptions) } : {})
  };
  const code = await prisma.flashSaleCode.update({ where: { id: req.params.id }, data });
  res.json(serializeFlashSaleCode(code));
});

export const deleteFlashSaleCode = asyncHandler(async (req, res) => {
  await prisma.flashSaleCode.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
