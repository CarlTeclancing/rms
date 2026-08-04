import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import {
  activeMarketingWhere,
  marketingItemSelect,
  marketingModules,
  normalizeMarketingItem
} from '../services/marketing.service.js';

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseDate = (value) => (value ? new Date(value) : null);

const sanitizePayload = (body, userId) => ({
  type: body.type,
  status: body.status || 'DRAFT',
  title: body.title,
  description: body.description || null,
  imageUrl: body.imageUrl || null,
  ctaLabel: body.ctaLabel || null,
  deepLink: body.deepLink || null,
  audience: body.audience || 'All customers',
  startsAt: parseDate(body.startsAt),
  endsAt: parseDate(body.endsAt),
  priority: Number(body.priority || 0),
  config: body.config || {},
  metrics: body.metrics || {},
  createdById: userId
});

export const marketingDashboard = asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const now = new Date();
  const [
    ordersToday,
    campaignRevenue,
    couponUsage,
    rewardClaims,
    spinPlays,
    referralSignups,
    activeCampaigns,
    recentCampaigns,
    upcomingCampaigns,
    todaysFlashDeals,
    scheduledNotifications
  ] = await Promise.all([
    prisma.onlineOrder.count({ where: { createdAt: { gte: today } } }),
    prisma.onlineOrder.aggregate({ where: { createdAt: { gte: today } }, _sum: { total: true } }),
    prisma.marketingItem.count({ where: { type: 'COUPON', status: { in: ['ACTIVE', 'SCHEDULED'] } } }),
    prisma.marketingItem.count({ where: { type: 'DAILY_REWARD', status: { in: ['ACTIVE', 'SCHEDULED'] } } }),
    prisma.marketingItem.count({ where: { type: 'SPIN_WHEEL', status: { in: ['ACTIVE', 'SCHEDULED'] } } }),
    prisma.customer.count({ where: { referredById: { not: null }, createdAt: { gte: today } } }),
    prisma.marketingItem.count({ where: activeMarketingWhere(now) }),
    prisma.marketingItem.findMany({ where: { type: 'CAMPAIGN' }, orderBy: { updatedAt: 'desc' }, take: 5, select: marketingItemSelect }),
    prisma.marketingItem.findMany({ where: { startsAt: { gt: now }, status: 'SCHEDULED' }, orderBy: { startsAt: 'asc' }, take: 5, select: marketingItemSelect }),
    prisma.marketingItem.findMany({ where: { type: 'FLASH_DEAL', ...activeMarketingWhere(now) }, orderBy: [{ priority: 'desc' }, { startsAt: 'asc' }], take: 5, select: marketingItemSelect }),
    prisma.marketingItem.findMany({ where: { type: 'PUSH_NOTIFICATION', startsAt: { gte: now }, status: 'SCHEDULED' }, orderBy: { startsAt: 'asc' }, take: 5, select: marketingItemSelect })
  ]);

  res.json({
    kpis: {
      dailyActiveUsers: ordersToday,
      ordersToday,
      campaignRevenue: Number(campaignRevenue._sum.total || 0),
      couponUsage,
      pushCtr: 0,
      dailyRewardClaims: rewardClaims,
      spinWheelPlays: spinPlays,
      referralSignups,
      activeCampaigns
    },
    recentCampaigns: recentCampaigns.map(normalizeMarketingItem),
    upcomingCampaigns: upcomingCampaigns.map(normalizeMarketingItem),
    todaysFlashDeals: todaysFlashDeals.map(normalizeMarketingItem),
    scheduledNotifications: scheduledNotifications.map(normalizeMarketingItem),
    modules: marketingModules
  });
});

export const listMarketingItems = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  const items = await prisma.marketingItem.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    select: marketingItemSelect
  });
  res.json({ items: items.map(normalizeMarketingItem), modules: marketingModules });
});

export const createMarketingItem = asyncHandler(async (req, res) => {
  if (!marketingModules.includes(req.body.type)) throw new ApiError(422, 'Unsupported marketing module');
  const item = await prisma.marketingItem.create({
    data: sanitizePayload(req.body, req.user?.id),
    select: marketingItemSelect
  });
  res.status(201).json(normalizeMarketingItem(item));
});

export const updateMarketingItem = asyncHandler(async (req, res) => {
  const item = await prisma.marketingItem.update({
    where: { id: req.params.id },
    data: {
      ...sanitizePayload(req.body, req.user?.id),
      createdById: undefined
    },
    select: marketingItemSelect
  });
  res.json(normalizeMarketingItem(item));
});

export const deleteMarketingItem = asyncHandler(async (req, res) => {
  await prisma.marketingItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const publicMarketingItems = asyncHandler(async (_req, res) => {
  const now = new Date();
  const items = await prisma.marketingItem.findMany({
    where: activeMarketingWhere(now),
    orderBy: [{ priority: 'desc' }, { startsAt: 'asc' }],
    take: 20,
    select: marketingItemSelect
  });
  const activeItems = items.map(normalizeMarketingItem).filter((item) => item.effectiveStatus === 'ACTIVE');
  const banners = activeItems.filter((item) =>
    ['HOMEPAGE_BANNER', 'CAMPAIGN', 'FLASH_DEAL', 'FEATURED_RESTAURANT', 'ANNOUNCEMENT', 'COUPON'].includes(item.type)
  );
  res.json({
    items: activeItems,
    banners,
    hero: banners[0] || null,
    floatingRewards: activeItems.filter((item) => ['DAILY_REWARD', 'SPIN_WHEEL', 'DAILY_STREAK', 'CHALLENGE', 'REFERRAL_PROGRAM'].includes(item.type)).slice(0, 5),
    flashDeal: activeItems.find((item) => item.type === 'FLASH_DEAL') || null
  });
});

export const exportMarketingReport = asyncHandler(async (_req, res) => {
  const items = await prisma.marketingItem.findMany({ orderBy: { updatedAt: 'desc' }, select: marketingItemSelect });
  const rows = [
    ['Type', 'Title', 'Status', 'Audience', 'Starts At', 'Ends At', 'Priority'],
    ...items.map((item) => [item.type, item.title, item.status, item.audience || '', item.startsAt?.toISOString() || '', item.endsAt?.toISOString() || '', item.priority])
  ];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="marketing-report.csv"');
  res.send(rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n'));
});
