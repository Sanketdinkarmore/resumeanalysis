import { z } from "zod";

const applicationStageEnum = z.enum([
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);

export const createApplicationSchema = z.object({
  resumeVersionId: z.string().uuid(),
  jobDescriptionId: z.string().uuid(),
  matchAnalysisId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateApplicationNotesSchema = z.object({
  notes: z.string().max(5000).nullable(),
});

export const updateApplicationStageSchema = z.object({
  stage: applicationStageEnum,
  note: z.string().max(1000).optional(),
});

export const listApplicationsQuerySchema = z.object({
  stage: applicationStageEnum.optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["updatedAt", "createdAt", "companyName"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
