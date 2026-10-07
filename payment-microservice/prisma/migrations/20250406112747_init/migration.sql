/*
  Warnings:

  - The values [PAID] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED');
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
