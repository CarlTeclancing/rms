CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "restaurantName" TEXT NOT NULL DEFAULT 'ChopASAP',
    "shortName" TEXT NOT NULL DEFAULT 'ChopASAP',
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 1000,
    "publicOrdering" BOOLEAN NOT NULL DEFAULT true,
    "reservations" BOOLEAN NOT NULL DEFAULT true,
    "supportPhone" TEXT NOT NULL DEFAULT '+237671286999',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppSettings" (
    "id",
    "restaurantName",
    "shortName",
    "currency",
    "deliveryFee",
    "publicOrdering",
    "reservations",
    "supportPhone",
    "updatedAt"
) VALUES (
    'default',
    'ChopASAP',
    'ChopASAP',
    'XAF',
    1000,
    true,
    true,
    '+237671286999',
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
