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
const visibleBannerTypes = ['HOMEPAGE_BANNER', 'CAMPAIGN', 'FLASH_DEAL', 'FEATURED_RESTAURANT', 'ANNOUNCEMENT', 'COUPON'];
const claimableRewardTypes = ['DAILY_REWARD', 'DAILY_STREAK', 'LOYALTY_PROGRAM', 'CHALLENGE', 'REFERRAL_PROGRAM'];

const startOfUtcDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const rewardPointsFor = (item) => {
  const configured = Number(item.config?.points || item.config?.rewardPoints || item.config?.bonusPoints || 0);
  if (configured > 0) return configured;
  if (item.type === 'DAILY_STREAK') return 10;
  if (item.type === 'DAILY_REWARD') return 5;
  return 5;
};

const serializeRewardCustomer = (customer, orderCount = 0) => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  email: customer.email,
  address: customer.address,
  profileImageUrl: customer.profileImageUrl,
  points: customer.points,
  referralCode: customer.referralCode,
  orderCount,
  referralCount: customer._count?.referrals || 0
});

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
    recentCampaigns: recentCampaigns.map((item) => normalizeMarketingItem(item, now)),
    upcomingCampaigns: upcomingCampaigns.map((item) => normalizeMarketingItem(item, now)),
    todaysFlashDeals: todaysFlashDeals.map((item) => normalizeMarketingItem(item, now)),
    scheduledNotifications: scheduledNotifications.map((item) => normalizeMarketingItem(item, now)),
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
  const now = new Date();
  res.json({ items: items.map((item) => normalizeMarketingItem(item, now)), modules: marketingModules });
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
    where: {
      status: { in: ['ACTIVE', 'SCHEDULED'] },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    },
    orderBy: [{ priority: 'desc' }, { startsAt: 'asc' }],
    take: 20,
    select: marketingItemSelect
  });
  const activeItems = items.map((item) => normalizeMarketingItem(item, now)).filter((item) => item.effectiveStatus === 'ACTIVE');
  const banners = activeItems.filter((item) => visibleBannerTypes.includes(item.type));
  res.json({
    items: activeItems,
    banners,
    hero: banners[0] || null,
    floatingRewards: activeItems.filter((item) => ['DAILY_REWARD', 'SPIN_WHEEL', 'DAILY_STREAK', 'CHALLENGE', 'REFERRAL_PROGRAM'].includes(item.type)).slice(0, 5),
    flashDeal: activeItems.find((item) => item.type === 'FLASH_DEAL') || null
  });
});

export const claimPublicReward = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = startOfUtcDay(now);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const [customer, reward] = await Promise.all([
    prisma.customer.findUnique({ where: { id: req.body.customerId }, include: { _count: { select: { referrals: true } } } }),
    prisma.marketingItem.findFirst({
      where: {
        id: req.params.id,
        type: { in: claimableRewardTypes },
        status: { in: ['ACTIVE', 'SCHEDULED'] },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
      },
      select: marketingItemSelect
    })
  ]);

  if (!customer) throw new ApiError(404, 'Customer not found');
  if (!reward) throw new ApiError(404, 'Reward is not available');

  const existingClaim = await prisma.customerRewardClaim.findUnique({
    where: {
      customerId_marketingItemId_claimDate: {
        customerId: customer.id,
        marketingItemId: reward.id,
        claimDate: today
      }
    }
  });
  if (existingClaim) {
    res.json({
      claimed: false,
      alreadyClaimed: true,
      pointsEarned: 0,
      streakCount: existingClaim.streakCount,
      customer: serializeRewardCustomer(customer)
    });
    return;
  }

  const previousClaim = await prisma.customerRewardClaim.findFirst({
    where: {
      customerId: customer.id,
      marketingItemId: reward.id,
      claimDate: yesterday
    },
    orderBy: { createdAt: 'desc' }
  });
  const streakCount = previousClaim ? previousClaim.streakCount + 1 : 1;
  const pointsEarned = rewardPointsFor(reward);

  const updatedCustomer = await prisma.$transaction(async (tx) => {
    await tx.customerRewardClaim.create({
      data: {
        customerId: customer.id,
        marketingItemId: reward.id,
        claimDate: today,
        points: pointsEarned,
        streakCount
      }
    });
    return tx.customer.update({
      where: { id: customer.id },
      data: { points: { increment: pointsEarned } },
      include: { _count: { select: { referrals: true } } }
    });
  });
  const orderCount = await prisma.onlineOrder.count({
    where: { OR: [{ customerId: updatedCustomer.id }, { customerPhone: updatedCustomer.phone }] }
  });

  res.status(201).json({
    claimed: true,
    pointsEarned,
    streakCount,
    reward: normalizeMarketingItem(reward, now),
    customer: serializeRewardCustomer(updatedCustomer, orderCount)
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
