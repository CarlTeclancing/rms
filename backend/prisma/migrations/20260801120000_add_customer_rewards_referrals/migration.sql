ALTER TABLE "Customer" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "Customer" ADD COLUMN "referredById" TEXT;

UPDATE "Customer"
SET "referralCode" = upper(substr(md5("id" || "phone"), 1, 8))
WHERE "referralCode" IS NULL;

ALTER TABLE "Customer" ALTER COLUMN "referralCode" SET NOT NULL;

CREATE UNIQUE INDEX "Customer_referralCode_key" ON "Customer"("referralCode");
CREATE INDEX "Customer_referredById_idx" ON "Customer"("referredById");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_referredById_fkey"
FOREIGN KEY ("referredById") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnlineOrder" ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OnlineOrder" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "OnlineOrder" ADD COLUMN "recipientPhone" TEXT;
ALTER TABLE "OnlineOrder" ADD COLUMN "recipientAddress" TEXT;
