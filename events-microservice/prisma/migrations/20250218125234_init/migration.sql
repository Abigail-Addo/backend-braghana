/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "imageUrl",
ADD COLUMN     "eventImg" TEXT;
