-- AlterTable
ALTER TABLE "OrderEvent" ADD COLUMN "resendEmailId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_resendEmailId_key" ON "OrderEvent"("resendEmailId");
