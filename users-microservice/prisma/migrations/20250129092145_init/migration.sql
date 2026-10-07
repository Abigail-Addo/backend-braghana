/*
  Warnings:

  - You are about to drop the column `reportedId` on the `ReportedUser` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reporterId,reportedUserId]` on the table `ReportedUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reportedUserId` to the `ReportedUser` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ReportedUser" DROP CONSTRAINT "ReportedUser_reportedId_fkey";

-- DropIndex
DROP INDEX "ReportedUser_reportedId_idx";

-- DropIndex
DROP INDEX "ReportedUser_reporterId_reportedId_key";

-- AlterTable
ALTER TABLE "ReportedUser" DROP COLUMN "reportedId",
ADD COLUMN     "reportedUserId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "ReportedUser_reportedUserId_idx" ON "ReportedUser"("reportedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportedUser_reporterId_reportedUserId_key" ON "ReportedUser"("reporterId", "reportedUserId");

-- AddForeignKey
ALTER TABLE "ReportedUser" ADD CONSTRAINT "ReportedUser_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
