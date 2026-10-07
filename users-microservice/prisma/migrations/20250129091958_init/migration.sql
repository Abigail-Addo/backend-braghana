-- CreateTable
CREATE TABLE "ReportedUser" (
    "reportId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporterId" UUID NOT NULL,
    "reportedId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportedUser_pkey" PRIMARY KEY ("reportId")
);

-- CreateIndex
CREATE INDEX "ReportedUser_reporterId_idx" ON "ReportedUser"("reporterId");

-- CreateIndex
CREATE INDEX "ReportedUser_reportedId_idx" ON "ReportedUser"("reportedId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportedUser_reporterId_reportedId_key" ON "ReportedUser"("reporterId", "reportedId");

-- AddForeignKey
ALTER TABLE "ReportedUser" ADD CONSTRAINT "ReportedUser_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportedUser" ADD CONSTRAINT "ReportedUser_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
