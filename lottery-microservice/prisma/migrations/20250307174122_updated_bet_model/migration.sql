/*
  Warnings:

  - You are about to drop the `PaymentTransaction` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[paymentReference]` on the table `Bet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "PaymentTransaction";

-- CreateIndex
CREATE UNIQUE INDEX "Bet_paymentReference_key" ON "Bet"("paymentReference");
