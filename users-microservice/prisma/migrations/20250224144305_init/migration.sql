/*
  Warnings:

  - The primary key for the `Otp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tokenId` on the `Otp` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Otp" DROP CONSTRAINT "Otp_pkey",
DROP COLUMN "tokenId",
ADD COLUMN     "otpId" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "Otp_pkey" PRIMARY KEY ("otpId");
