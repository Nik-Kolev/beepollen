/*
  Warnings:

  - Added the required column `officeCarrier` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeCity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeCode` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `officeStreet` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "officeCarrier" TEXT NOT NULL,
    "officeCode" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "officeCity" TEXT NOT NULL,
    "officeStreet" TEXT NOT NULL,
    "itemsCents" INTEGER NOT NULL,
    "deliveryCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("contactName", "contactPhone", "createdAt", "customerId", "deliveryCents", "id", "idempotencyKey", "itemsCents", "reference", "status", "totalCents", "updatedAt") SELECT "contactName", "contactPhone", "createdAt", "customerId", "deliveryCents", "id", "idempotencyKey", "itemsCents", "reference", "status", "totalCents", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
