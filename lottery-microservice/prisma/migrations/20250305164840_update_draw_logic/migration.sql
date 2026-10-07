-- CreateTable
CREATE TABLE "Bet" (
    "betId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "numbers" INTEGER[],
    "stakeAmount" INTEGER NOT NULL,
    "drawId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("betId")
);

-- CreateTable
CREATE TABLE "Draw" (
    "drawId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "winningNumber" INTEGER,
    "drawDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "winnerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("drawId")
);

-- CreateIndex
CREATE INDEX "Bet_createdAt_idx" ON "Bet"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Draw_drawDate_key" ON "Draw"("drawDate");

-- CreateIndex
CREATE INDEX "Draw_createdAt_idx" ON "Draw"("createdAt");

-- CreateIndex
CREATE INDEX "Draw_drawDate_idx" ON "Draw"("drawDate");

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("drawId") ON DELETE SET NULL ON UPDATE CASCADE;
