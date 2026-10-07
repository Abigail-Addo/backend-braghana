-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "status" "BetStatus" NOT NULL DEFAULT 'PENDING';
