-- CreateTable
CREATE TABLE "EmailBounce" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "resendEmailId" TEXT NOT NULL,
    "permanent" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailBounce_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailBounce_resendEmailId_key" ON "EmailBounce"("resendEmailId");

-- CreateIndex
CREATE INDEX "EmailBounce_customerId_idx" ON "EmailBounce"("customerId");

