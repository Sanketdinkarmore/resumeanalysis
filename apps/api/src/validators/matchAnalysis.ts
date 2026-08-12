import { z } from "zod";

export const createMatchAnalysisSchema = z.object({
  resumeVersionId: z.string().uuid(),
  jobDescriptionId: z.string().uuid(),
});
