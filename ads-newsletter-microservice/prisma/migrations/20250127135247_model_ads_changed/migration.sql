/*
  Warnings:

  - You are about to drop the column `newsletterNewsletterId` on the `Ad` table. All the data in the column will be lost.
  - You are about to drop the column `targetedAudience` on the `Ad` table. All the data in the column will be lost.
  - You are about to drop the `Newsletter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewsletterLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscriber` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AdsInNewsletters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_NewsletterSubscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ad" DROP CONSTRAINT "Ad_newsletterNewsletterId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterLog" DROP CONSTRAINT "NewsletterLog_newsletterId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterLog" DROP CONSTRAINT "NewsletterLog_subscriberId_fkey";

-- DropForeignKey
ALTER TABLE "_AdsInNewsletters" DROP CONSTRAINT "_AdsInNewsletters_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdsInNewsletters" DROP CONSTRAINT "_AdsInNewsletters_B_fkey";

-- DropForeignKey
ALTER TABLE "_NewsletterSubscriptions" DROP CONSTRAINT "_NewsletterSubscriptions_A_fkey";

-- DropForeignKey
ALTER TABLE "_NewsletterSubscriptions" DROP CONSTRAINT "_NewsletterSubscriptions_B_fkey";

-- AlterTable
ALTER TABLE "Ad" DROP COLUMN "newsletterNewsletterId",
DROP COLUMN "targetedAudience";

-- DropTable
DROP TABLE "Newsletter";

-- DropTable
DROP TABLE "NewsletterLog";

-- DropTable
DROP TABLE "Subscriber";

-- DropTable
DROP TABLE "_AdsInNewsletters";

-- DropTable
DROP TABLE "_NewsletterSubscriptions";
