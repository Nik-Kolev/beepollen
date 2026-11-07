-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "wording" TEXT NOT NULL,
    "ipAddress" TEXT,
    "withdrawnAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Consent" ("createdAt", "id", "ipAddress", "kind", "orderId", "withdrawnAt", "wording") SELECT "createdAt", "id", "ipAddress", "kind", "orderId", "withdrawnAt", "wording" FROM "Consent";
DROP TABLE "Consent";
ALTER TABLE "new_Consent" RENAME TO "Consent";
CREATE INDEX "Consent_orderId_idx" ON "Consent"("orderId");
CREATE UNIQUE INDEX "Consent_orderId_kind_key" ON "Consent"("orderId", "kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
