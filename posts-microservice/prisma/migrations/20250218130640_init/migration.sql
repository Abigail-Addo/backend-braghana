-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "commentCommentId" UUID;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentCommentId_fkey" FOREIGN KEY ("commentCommentId") REFERENCES "Comment"("commentId") ON DELETE SET NULL ON UPDATE CASCADE;
