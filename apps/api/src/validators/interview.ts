import { z } from "zod";

export const createInterviewSetSchema = z.object({
  jobDescriptionId: z.string().uuid(),
  /** Prefer this — pulls the resume linked to the application automatically */
  applicationId: z.string().uuid().optional(),
  /** Or pass a resume explicitly (JD + resume grounded questions) */
  resumeVersionId: z.string().uuid().optional(),
});
