-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "variety" TEXT,
    "priceCents" INTEGER NOT NULL,
    "stock" TEXT NOT NULL DEFAULT 'PLENTY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "netWeightGrams" INTEGER,
    "composition" TEXT,
    "origin" TEXT,
    "storage" TEXT,
    "bestBefore" TEXT,
    "allergenInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("allergenInfo", "bestBefore", "composition", "createdAt", "description", "id", "isPublished", "name", "netWeightGrams", "origin", "priceCents", "slug", "sortOrder", "stock", "storage", "summary", "updatedAt", "variety") SELECT "allergenInfo", "bestBefore", "composition", "createdAt", "description", "id", "isPublished", "name", "netWeightGrams", "origin", "priceCents", "slug", "sortOrder", "stock", "storage", "summary", "updatedAt", "variety" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_isPublished_sortOrder_idx" ON "Product"("isPublished", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
