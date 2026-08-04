const activeStatuses = ['ACTIVE', 'SCHEDULED'];

export const marketingModules = [
  'CAMPAIGN',
  'DAILY_REWARD',
  'SPIN_WHEEL',
  'FLASH_DEAL',
  'COUPON',
  'REFERRAL_PROGRAM',
  'LOYALTY_PROGRAM',
  'DAILY_STREAK',
  'FEATURED_RESTAURANT',
  'HOMEPAGE_BANNER',
  'PUSH_NOTIFICATION',
  'CHALLENGE',
  'ANNOUNCEMENT'
];

export const computeScheduleStatus = (item, now = new Date()) => {
  if (['PAUSED', 'ARCHIVED'].includes(item.status)) return item.status;
  const startsAt = item.startsAt ? new Date(item.startsAt) : null;
  const endsAt = item.endsAt ? new Date(item.endsAt) : null;
  if (endsAt && endsAt < now) return 'EXPIRED';
  if (startsAt && startsAt > now) return 'SCHEDULED';
  return item.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
};

export const normalizeMarketingItem = (item, now = new Date()) => ({
  ...item,
  effectiveStatus: computeScheduleStatus(item, now)
});

export const activeMarketingWhere = (now = new Date()) => ({
  status: { in: activeStatuses },
  OR: [{ startsAt: null }, { startsAt: { lte: now } }],
  AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
});

export const marketingItemSelect = {
  id: true,
  type: true,
  status: true,
  title: true,
  description: true,
  imageUrl: true,
  ctaLabel: true,
  deepLink: true,
  audience: true,
  startsAt: true,
  endsAt: true,
  priority: true,
  config: true,
  metrics: true,
  createdAt: true,
  updatedAt: true
};
