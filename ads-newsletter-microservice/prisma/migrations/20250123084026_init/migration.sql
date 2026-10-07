-- CreateTable
CREATE TABLE "Ad" (
    "adId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetedAudience" TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "newsletterNewsletterId" UUID,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("adId")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "newsletterId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sendDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("newsletterId")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "subscriberId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("subscriberId")
);

-- CreateTable
CREATE TABLE "NewsletterLog" (
    "newsletterLogId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "newsletterId" UUID NOT NULL,
    "subscriberId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NewsletterLog_pkey" PRIMARY KEY ("newsletterLogId")
);

-- CreateTable
CREATE TABLE "_AdsInNewsletters" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AdsInNewsletters_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NewsletterSubscriptions" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_NewsletterSubscriptions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Ad_startDate_endDate_idx" ON "Ad"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterLog_sentAt_idx" ON "NewsletterLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterLog_newsletterId_subscriberId_key" ON "NewsletterLog"("newsletterId", "subscriberId");

-- CreateIndex
CREATE INDEX "_AdsInNewsletters_B_index" ON "_AdsInNewsletters"("B");

-- CreateIndex
CREATE INDEX "_NewsletterSubscriptions_B_index" ON "_NewsletterSubscriptions"("B");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_newsletterNewsletterId_fkey" FOREIGN KEY ("newsletterNewsletterId") REFERENCES "Newsletter"("newsletterId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterLog" ADD CONSTRAINT "NewsletterLog_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("newsletterId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterLog" ADD CONSTRAINT "NewsletterLog_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("subscriberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdsInNewsletters" ADD CONSTRAINT "_AdsInNewsletters_A_fkey" FOREIGN KEY ("A") REFERENCES "Ad"("adId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdsInNewsletters" ADD CONSTRAINT "_AdsInNewsletters_B_fkey" FOREIGN KEY ("B") REFERENCES "Newsletter"("newsletterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NewsletterSubscriptions" ADD CONSTRAINT "_NewsletterSubscriptions_A_fkey" FOREIGN KEY ("A") REFERENCES "Newsletter"("newsletterId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NewsletterSubscriptions" ADD CONSTRAINT "_NewsletterSubscriptions_B_fkey" FOREIGN KEY ("B") REFERENCES "Subscriber"("subscriberId") ON DELETE CASCADE ON UPDATE CASCADE;
