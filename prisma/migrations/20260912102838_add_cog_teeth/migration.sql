/*
  Warnings:

  - Added the required column `teeth` to the `Cog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nickname" TEXT NOT NULL,
    "teeth" INTEGER NOT NULL,
    "sprocketId" INTEGER NOT NULL,
    CONSTRAINT "Cog_sprocketId_fkey" FOREIGN KEY ("sprocketId") REFERENCES "Sprocket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Cog" ("id", "nickname", "teeth", "sprocketId") SELECT "id", "nickname", 12, "sprocketId" FROM "Cog";
DROP TABLE "Cog";
ALTER TABLE "new_Cog" RENAME TO "Cog";
CREATE INDEX "Cog_sprocketId_idx" ON "Cog"("sprocketId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
