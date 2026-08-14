import { JobStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { parseJobDescription, parseResumePdf } from "./aiClient.js";
import { prisma } from "./prisma.js";
import { downloadResumePdf } from "./storage.js";

function parseErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Parse failed";
}

export async function runResumeParse(resumeVersionId: string): Promise<void> {
  const resume = await prisma.resumeVersion.findUnique({
    where: { id: resumeVersionId },
    select: {
      id: true,
      s3Key: true,
      originalFilename: true,
      deletedAt: true,
    },
  });

  if (!resume || resume.deletedAt) {
    return;
  }

  await prisma.resumeVersion.update({
    where: { id: resumeVersionId },
    data: { parseStatus: JobStatus.PROCESSING, parseError: null },
  });

  try {
    const buffer = await downloadResumePdf(resume.s3Key);
    const parsed = await parseResumePdf(buffer, resume.originalFilename);

    await prisma.parsedResumeData.upsert({
      where: { resumeVersionId },
      create: {
        resumeVersionId,
        contact: parsed.contact as Prisma.InputJsonValue,
        summary: parsed.summary,
        skills: parsed.skills as Prisma.InputJsonValue,
        experience: parsed.experience as Prisma.InputJsonValue,
        education: parsed.education as Prisma.InputJsonValue,
        projects: parsed.projects as Prisma.InputJsonValue,
        certifications: parsed.certifications as Prisma.InputJsonValue,
        rawExtract: parsed.rawExtract as Prisma.InputJsonValue,
      },
      update: {
        contact: parsed.contact as Prisma.InputJsonValue,
        summary: parsed.summary,
        skills: parsed.skills as Prisma.InputJsonValue,
        experience: parsed.experience as Prisma.InputJsonValue,
        education: parsed.education as Prisma.InputJsonValue,
        projects: parsed.projects as Prisma.InputJsonValue,
        certifications: parsed.certifications as Prisma.InputJsonValue,
        rawExtract: parsed.rawExtract as Prisma.InputJsonValue,
      },
    });

    await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: { parseStatus: JobStatus.COMPLETED, parseError: null },
    });
  } catch (err) {
    await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: { parseStatus: JobStatus.FAILED, parseError: parseErrorMessage(err) },
    });
    throw err;
  }
}

export async function runJobParse(jobDescriptionId: string): Promise<void> {
  const job = await prisma.jobDescription.findUnique({
    where: { id: jobDescriptionId },
    select: { id: true, rawText: true },
  });

  if (!job) {
    return;
  }

  await prisma.jobDescription.update({
    where: { id: jobDescriptionId },
    data: { parseStatus: JobStatus.PROCESSING, parseError: null },
  });

  try {
    const parsed = await parseJobDescription(job.rawText);

    await prisma.parsedJobDescription.upsert({
      where: { jobDescriptionId },
      create: {
        jobDescriptionId,
        requiredSkills: parsed.requiredSkills as Prisma.InputJsonValue,
        preferredSkills: parsed.preferredSkills as Prisma.InputJsonValue,
        responsibilities: parsed.responsibilities as Prisma.InputJsonValue,
        qualifications: parsed.qualifications as Prisma.InputJsonValue,
        seniority: parsed.seniority,
        keywords: parsed.keywords as Prisma.InputJsonValue,
        rawExtract: parsed.rawExtract as Prisma.InputJsonValue,
      },
      update: {
        requiredSkills: parsed.requiredSkills as Prisma.InputJsonValue,
        preferredSkills: parsed.preferredSkills as Prisma.InputJsonValue,
        responsibilities: parsed.responsibilities as Prisma.InputJsonValue,
        qualifications: parsed.qualifications as Prisma.InputJsonValue,
        seniority: parsed.seniority,
        keywords: parsed.keywords as Prisma.InputJsonValue,
        rawExtract: parsed.rawExtract as Prisma.InputJsonValue,
      },
    });

    await prisma.jobDescription.update({
      where: { id: jobDescriptionId },
      data: { parseStatus: JobStatus.COMPLETED, parseError: null },
    });
  } catch (err) {
    await prisma.jobDescription.update({
      where: { id: jobDescriptionId },
      data: { parseStatus: JobStatus.FAILED, parseError: parseErrorMessage(err) },
    });
    throw err;
  }
}
