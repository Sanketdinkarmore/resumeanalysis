import { z } from "zod";

export const createJobDescriptionSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  roleTitle: z.string().min(1, "Role title is required").max(200),
  sourceUrl: z.string().url("Must be a valid URL").nullish().or(z.literal("")),
  rawText: z
    .string()
    .min(50, "Job description must be at least 50 characters")
    .max(50000, "Job description too long"),
});

export const updateJobDescriptionSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  roleTitle: z.string().min(1).max(200).optional(),
  sourceUrl: z.string().url().nullish().or(z.literal("")),
  rawText: z.string().min(50).max(20000).optional(),
});
