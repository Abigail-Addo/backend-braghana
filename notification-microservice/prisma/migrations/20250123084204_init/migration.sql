-- CreateTable
CREATE TABLE "Notification" (
    "notificationId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "postId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notificationId")
);
