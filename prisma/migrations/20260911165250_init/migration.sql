-- CreateTable
CREATE TABLE "Sprocket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nickname" TEXT NOT NULL,
    "sprocketId" INTEGER NOT NULL,
    CONSTRAINT "Cog_sprocketId_fkey" FOREIGN KEY ("sprocketId") REFERENCES "Sprocket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Sprocket_label_key" ON "Sprocket"("label");

-- CreateIndex
CREATE INDEX "Cog_sprocketId_idx" ON "Cog"("sprocketId");
