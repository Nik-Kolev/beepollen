-- CreateTable
CREATE TABLE "DeliveryOffice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carrier" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postCode" TEXT,
    "street" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "phone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DeliveryOffice_carrier_city_idx" ON "DeliveryOffice"("carrier", "city");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOffice_carrier_code_key" ON "DeliveryOffice"("carrier", "code");
