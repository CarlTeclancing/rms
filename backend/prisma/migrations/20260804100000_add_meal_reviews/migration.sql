CREATE TABLE "MealReview" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealReview_menuItemId_idx" ON "MealReview"("menuItemId");
CREATE INDEX "MealReview_rating_idx" ON "MealReview"("rating");

ALTER TABLE "MealReview"
ADD CONSTRAINT "MealReview_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
