/*
  Warnings:

  - You are about to alter the column `amount` on the `PaymentTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ALTER COLUMN "amount" SET DATA TYPE INTEGER;
