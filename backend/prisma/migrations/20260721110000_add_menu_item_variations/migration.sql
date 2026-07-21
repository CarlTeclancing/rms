ALTER TABLE "MenuItem" ADD COLUMN "variations" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "OnlineOrderItem" ADD COLUMN "variationName" TEXT;
