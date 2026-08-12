-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('ADD_SKILL', 'ADD_KEYWORD', 'IMPROVE_BULLET', 'CLARIFY_EXPERIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RecommendationSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EDITED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "s3Key" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "parseStatus" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "parseError" TEXT,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_resume_data" (
    "id" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "contact" JSONB,
    "summary" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "experience" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "projects" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "rawExtract" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parsed_resume_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_improvement_suggestions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "targetPath" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT,
    "rationale" TEXT,
    "requiresMetric" BOOLEAN NOT NULL DEFAULT false,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "userEditedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_improvement_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "rawText" TEXT NOT NULL,
    "parseStatus" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "parseError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_job_descriptions" (
    "id" UUID NOT NULL,
    "jobDescriptionId" UUID NOT NULL,
    "requiredSkills" JSONB NOT NULL DEFAULT '[]',
    "preferredSkills" JSONB NOT NULL DEFAULT '[]',
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "qualifications" JSONB NOT NULL DEFAULT '[]',
    "seniority" TEXT NOT NULL DEFAULT 'unknown',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "rawExtract" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parsed_job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_analyses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "jobDescriptionId" UUID NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "mustHaveScore" DOUBLE PRECISION,
    "preferredScore" DOUBLE PRECISION,
    "keywordScore" DOUBLE PRECISION,
    "seniorityScore" DOUBLE PRECISION,
    "matchedSkills" JSONB NOT NULL DEFAULT '[]',
    "missingMustHave" JSONB NOT NULL DEFAULT '[]',
    "missingPreferred" JSONB NOT NULL DEFAULT '[]',
    "keywordCoverage" DOUBLE PRECISION,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_recommendations" (
    "id" UUID NOT NULL,
    "matchAnalysisId" UUID NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "severity" "RecommendationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "jobDescriptionId" UUID NOT NULL,
    "matchAnalysisId" UUID,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'SAVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_history" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fromStage" "ApplicationStage",
    "toStage" "ApplicationStage" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_question_sets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "applicationId" UUID,
    "jobDescriptionId" UUID NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_question_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" UUID NOT NULL,
    "questionSetId" UUID NOT NULL,
    "category" "QuestionCategory" NOT NULL,
    "prompt" TEXT NOT NULL,
    "answerOutline" TEXT,
    "answerGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "resume_versions_userId_createdAt_idx" ON "resume_versions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "resume_versions_userId_deletedAt_idx" ON "resume_versions"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "parsed_resume_data_resumeVersionId_key" ON "parsed_resume_data"("resumeVersionId");

-- CreateIndex
CREATE INDEX "resume_improvement_suggestions_resumeVersionId_status_idx" ON "resume_improvement_suggestions"("resumeVersionId", "status");

-- CreateIndex
CREATE INDEX "resume_improvement_suggestions_userId_idx" ON "resume_improvement_suggestions"("userId");

-- CreateIndex
CREATE INDEX "job_descriptions_userId_createdAt_idx" ON "job_descriptions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "parsed_job_descriptions_jobDescriptionId_key" ON "parsed_job_descriptions"("jobDescriptionId");

-- CreateIndex
CREATE INDEX "match_analyses_userId_createdAt_idx" ON "match_analyses"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "match_analyses_resumeVersionId_jobDescriptionId_createdAt_idx" ON "match_analyses"("resumeVersionId", "jobDescriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "match_recommendations_matchAnalysisId_idx" ON "match_recommendations"("matchAnalysisId");

-- CreateIndex
CREATE INDEX "applications_userId_stage_idx" ON "applications"("userId", "stage");

-- CreateIndex
CREATE INDEX "applications_userId_updatedAt_idx" ON "applications"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "application_stage_history_applicationId_changedAt_idx" ON "application_stage_history"("applicationId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "interview_question_sets_applicationId_key" ON "interview_question_sets"("applicationId");

-- CreateIndex
CREATE INDEX "interview_question_sets_userId_createdAt_idx" ON "interview_question_sets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "interview_questions_questionSetId_idx" ON "interview_questions"("questionSetId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_resume_data" ADD CONSTRAINT "parsed_resume_data_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_improvement_suggestions" ADD CONSTRAINT "resume_improvement_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_improvement_suggestions" ADD CONSTRAINT "resume_improvement_suggestions_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_job_descriptions" ADD CONSTRAINT "parsed_job_descriptions_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_analyses" ADD CONSTRAINT "match_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_analyses" ADD CONSTRAINT "match_analyses_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_analyses" ADD CONSTRAINT "match_analyses_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_recommendations" ADD CONSTRAINT "match_recommendations_matchAnalysisId_fkey" FOREIGN KEY ("matchAnalysisId") REFERENCES "match_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_matchAnalysisId_fkey" FOREIGN KEY ("matchAnalysisId") REFERENCES "match_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_sets" ADD CONSTRAINT "interview_question_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_sets" ADD CONSTRAINT "interview_question_sets_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_sets" ADD CONSTRAINT "interview_question_sets_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "interview_question_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
