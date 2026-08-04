-- CreateEnum
CREATE TYPE "DeliveryAgentStatus" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'DELIVERING', 'TAKING_BREAK');

-- CreateTable
CREATE TABLE "DeliveryAgent" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "vehicleInfo" TEXT,
    "status" "DeliveryAgentStatus" NOT NULL DEFAULT 'OFFLINE',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "heading" DECIMAL(6,2),
    "speedKph" DECIMAL(8,2),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAgent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OnlineOrder" ADD COLUMN "deliveryAgentId" TEXT,
ADD COLUMN "driverAcceptedAt" TIMESTAMP(3),
ADD COLUMN "driverDeliveredAt" TIMESTAMP(3),
ADD COLUMN "driverCommission" DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAgent_code_key" ON "DeliveryAgent"("code");

-- CreateIndex
CREATE INDEX "DeliveryAgent_name_idx" ON "DeliveryAgent"("name");

-- CreateIndex
CREATE INDEX "DeliveryAgent_status_idx" ON "DeliveryAgent"("status");

-- CreateIndex
CREATE INDEX "OnlineOrder_deliveryAgentId_idx" ON "OnlineOrder"("deliveryAgentId");

-- AddForeignKey
ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_deliveryAgentId_fkey" FOREIGN KEY ("deliveryAgentId") REFERENCES "DeliveryAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
