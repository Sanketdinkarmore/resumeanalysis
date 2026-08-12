-- AlterTable
ALTER TABLE "interview_question_sets" ADD COLUMN     "resumeVersionId" UUID;

-- AddForeignKey
ALTER TABLE "interview_question_sets" ADD CONSTRAINT "interview_question_sets_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
