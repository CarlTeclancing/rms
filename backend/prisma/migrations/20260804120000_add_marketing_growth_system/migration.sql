CREATE TYPE "MarketingItemType" AS ENUM (
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
);

CREATE TYPE "MarketingItemStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'ARCHIVED'
);

CREATE TABLE "MarketingItem" (
  "id" TEXT NOT NULL,
  "type" "MarketingItemType" NOT NULL,
  "status" "MarketingItemStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "ctaLabel" TEXT,
  "deepLink" TEXT,
  "audience" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB NOT NULL DEFAULT '{}',
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingItem_type_idx" ON "MarketingItem"("type");
CREATE INDEX "MarketingItem_status_idx" ON "MarketingItem"("status");
CREATE INDEX "MarketingItem_startsAt_idx" ON "MarketingItem"("startsAt");
CREATE INDEX "MarketingItem_endsAt_idx" ON "MarketingItem"("endsAt");
CREATE INDEX "MarketingItem_priority_idx" ON "MarketingItem"("priority");

ALTER TABLE "MarketingItem"
ADD CONSTRAINT "MarketingItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
