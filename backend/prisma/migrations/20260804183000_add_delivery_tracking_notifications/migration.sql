ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'DRIVER_ASSIGNED';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'DRIVER_TO_RESTAURANT';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'DRIVER_ARRIVED';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'DRIVER_NEARBY';

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "NotificationCategory" AS ENUM ('ORDERS', 'REWARDS', 'COUPONS', 'MARKETING', 'SUPPORT', 'PAYMENTS', 'SYSTEM');

ALTER TABLE "OnlineOrder" ADD COLUMN "driverName" TEXT;
ALTER TABLE "OnlineOrder" ADD COLUMN "driverPhone" TEXT;
ALTER TABLE "OnlineOrder" ADD COLUMN "driverPhotoUrl" TEXT;
ALTER TABLE "OnlineOrder" ADD COLUMN "vehicleInfo" TEXT;
ALTER TABLE "OnlineOrder" ADD COLUMN "driverLatitude" DECIMAL(10,7);
ALTER TABLE "OnlineOrder" ADD COLUMN "driverLongitude" DECIMAL(10,7);
ALTER TABLE "OnlineOrder" ADD COLUMN "driverHeading" DECIMAL(6,2);
ALTER TABLE "OnlineOrder" ADD COLUMN "driverSpeedKph" DECIMAL(8,2);
ALTER TABLE "OnlineOrder" ADD COLUMN "trackingUpdatedAt" TIMESTAMP(3);
ALTER TABLE "OnlineOrder" ADD COLUMN "etaMinutes" INTEGER;
ALTER TABLE "OnlineOrder" ADD COLUMN "distanceKm" DECIMAL(8,2);

CREATE TABLE "DeliveryTrackingEvent" (
    "id" TEXT NOT NULL,
    "onlineOrderId" TEXT NOT NULL,
    "status" "OnlineOrderStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "etaMinutes" INTEGER,
    "distanceKm" DECIMAL(8,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "onlineOrderId" TEXT,
    "customerId" TEXT,
    "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" TEXT,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryTrackingEvent_onlineOrderId_createdAt_idx" ON "DeliveryTrackingEvent"("onlineOrderId", "createdAt");
CREATE INDEX "DeliveryTrackingEvent_status_idx" ON "DeliveryTrackingEvent"("status");
CREATE INDEX "Notification_customerId_readAt_idx" ON "Notification"("customerId", "readAt");
CREATE INDEX "Notification_onlineOrderId_idx" ON "Notification"("onlineOrderId");
CREATE INDEX "Notification_category_idx" ON "Notification"("category");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

ALTER TABLE "DeliveryTrackingEvent" ADD CONSTRAINT "DeliveryTrackingEvent_onlineOrderId_fkey" FOREIGN KEY ("onlineOrderId") REFERENCES "OnlineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_onlineOrderId_fkey" FOREIGN KEY ("onlineOrderId") REFERENCES "OnlineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
