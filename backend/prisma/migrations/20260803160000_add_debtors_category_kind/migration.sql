CREATE TYPE "MenuCategoryKind" AS ENUM ('FOOD', 'DRINK', 'OTHER');

ALTER TABLE "MenuCategory"
ADD COLUMN "kind" "MenuCategoryKind" NOT NULL DEFAULT 'FOOD';

CREATE TYPE "DebtorStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

CREATE TABLE "Debtor" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "DebtorStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debtor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Debtor_status_idx" ON "Debtor"("status");
CREATE INDEX "Debtor_phone_idx" ON "Debtor"("phone");

ALTER TABLE "Debtor"
ADD CONSTRAINT "Debtor_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
