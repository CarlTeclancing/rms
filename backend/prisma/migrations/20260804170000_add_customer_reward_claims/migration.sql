CREATE TABLE "CustomerRewardClaim" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "marketingItemId" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "streakCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerRewardClaim_customerId_marketingItemId_claimDate_key" ON "CustomerRewardClaim"("customerId", "marketingItemId", "claimDate");
CREATE INDEX "CustomerRewardClaim_customerId_claimDate_idx" ON "CustomerRewardClaim"("customerId", "claimDate");
CREATE INDEX "CustomerRewardClaim_marketingItemId_idx" ON "CustomerRewardClaim"("marketingItemId");

ALTER TABLE "CustomerRewardClaim" ADD CONSTRAINT "CustomerRewardClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerRewardClaim" ADD CONSTRAINT "CustomerRewardClaim_marketingItemId_fkey" FOREIGN KEY ("marketingItemId") REFERENCES "MarketingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
