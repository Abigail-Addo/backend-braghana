-- CreateTable
CREATE TABLE "OtpLog" (
    "logId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "otp" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpLog_pkey" PRIMARY KEY ("logId")
);

-- CreateIndex
CREATE INDEX "OtpLog_userId_idx" ON "OtpLog"("userId");

-- CreateIndex
CREATE INDEX "OtpLog_attemptedAt_idx" ON "OtpLog"("attemptedAt");

-- AddForeignKey
ALTER TABLE "OtpLog" ADD CONSTRAINT "OtpLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
