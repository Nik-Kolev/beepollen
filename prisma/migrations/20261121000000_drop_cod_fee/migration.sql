-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "cancelledAt" DATETIME,
    "collectedAt" DATETIME,
    "withdrawnAt" DATETIME,
    "withdrawalName" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "officeCarrier" TEXT,
    "officeCode" TEXT,
    "officeName" TEXT,
    "officeCity" TEXT,
    "officeStreet" TEXT,
    "itemsCents" INTEGER NOT NULL,
    "deliveryCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cancelledAt", "collectedAt", "contactName", "contactPhone", "createdAt", "customerId", "deliveryCents", "deliveryMethod", "id", "idempotencyKey", "itemsCents", "officeCarrier", "officeCity", "officeCode", "officeName", "officeStreet", "paidAt", "reference", "sentAt", "totalCents", "updatedAt", "withdrawalName", "withdrawnAt") SELECT "cancelledAt", "collectedAt", "contactName", "contactPhone", "createdAt", "customerId", "deliveryCents", "deliveryMethod", "id", "idempotencyKey", "itemsCents", "officeCarrier", "officeCity", "officeCode", "officeName", "officeStreet", "paidAt", "reference", "sentAt", "totalCents", "updatedAt", "withdrawalName", "withdrawnAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

