import { JobStatus, QuestionCategory } from "@prisma/client";
import { Router } from "express";
import {
  generateAnswerOutline,
  generateInterviewQuestions,
} from "../lib/aiClient.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { createInterviewSetSchema } from "../validators/interview.js";

export const interviewRouter = Router();

interviewRouter.use(requireAuth);

function toStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : [];
}

/** Compact text Gemini can use — skills, summary, jobs, projects. */
function buildResumeContext(parsed: {
  summary: string | null;
  skills: unknown;
  experience: unknown;
  projects: unknown;
  education: unknown;
} | null): string | null {
  if (!parsed) return null;

  const lines: string[] = [];
  if (parsed.summary) lines.push(`Summary: ${parsed.summary}`);

  const skills = toStringArray(parsed.skills);
  if (skills.length) lines.push(`Skills: ${skills.slice(0, 40).join(", ")}`);

  if (Array.isArray(parsed.experience)) {
    lines.push("Experience:");
    for (const exp of parsed.experience as Array<{
      title?: string;
      company?: string;
      startDate?: string;
      endDate?: string;
      bullets?: Array<{ text?: string }>;
    }>) {
      lines.push(
        `- ${exp.title || "Role"} @ ${exp.company || "Company"} (${exp.startDate || ""} – ${exp.endDate || ""})`,
      );
      if (Array.isArray(exp.bullets)) {
        for (const b of exp.bullets.slice(0, 4)) {
          if (b.text) lines.push(`  • ${b.text}`);
        }
      }
    }
  }

  if (Array.isArray(parsed.projects)) {
    lines.push("Projects:");
    for (const p of parsed.projects as Array<{ text?: string }>) {
      if (p.text) lines.push(`- ${p.text}`);
    }
  }

  if (Array.isArray(parsed.education)) {
    lines.push("Education:");
    for (const e of parsed.education as Array<{ text?: string }>) {
      if (e.text) lines.push(`- ${e.text}`);
    }
  }

  const text = lines.join("\n").trim();
  return text || null;
}

// POST /interview-question-sets — generate + save questions for JD (+ resume when available)
interviewRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;
    const body = createInterviewSetSchema.parse(req.body);

    const jd = await prisma.jobDescription.findUnique({
      where: { id: body.jobDescriptionId },
      select: {
        userId: true,
        companyName: true,
        roleTitle: true,
        rawText: true,
        parsedData: true,
      },
    });

    if (!jd || jd.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Job description not found"));
      return;
    }

    let resumeVersionId = body.resumeVersionId ?? null;

    if (body.applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: body.applicationId },
        select: {
          userId: true,
          jobDescriptionId: true,
          resumeVersionId: true,
        },
      });

      if (!application || application.userId !== userId) {
        next(new AppError(404, "NOT_FOUND", "Application not found"));
        return;
      }

      if (application.jobDescriptionId !== body.jobDescriptionId) {
        next(
          new AppError(
            400,
            "APPLICATION_JD_MISMATCH",
            "Application is not linked to this job description",
          ),
        );
        return;
      }

      // Application implies the resume the recruiter would see
      resumeVersionId = resumeVersionId ?? application.resumeVersionId;

      // Schema: one set per application (@unique). Re-generate = replace existing.
      const existingForApp = await prisma.interviewQuestionSet.findUnique({
        where: { applicationId: body.applicationId },
        select: { id: true, userId: true },
      });
      if (existingForApp) {
        if (existingForApp.userId !== userId) {
          next(new AppError(404, "NOT_FOUND", "Application not found"));
          return;
        }
        await prisma.interviewQuestionSet.delete({
          where: { id: existingForApp.id },
        });
      }
    }

    let resumeContext: string | null = null;
    if (resumeVersionId) {
      const resume = await prisma.resumeVersion.findUnique({
        where: { id: resumeVersionId },
        select: {
          userId: true,
          deletedAt: true,
          parsedData: {
            select: {
              summary: true,
              skills: true,
              experience: true,
              projects: true,
              education: true,
            },
          },
        },
      });

      if (!resume || resume.userId !== userId || resume.deletedAt) {
        next(new AppError(404, "NOT_FOUND", "Resume not found"));
        return;
      }

      resumeContext = buildResumeContext(resume.parsedData);
    }

    const questionSet = await prisma.interviewQuestionSet.create({
      data: {
        userId,
        jobDescriptionId: body.jobDescriptionId,
        applicationId: body.applicationId ?? null,
        resumeVersionId: resumeVersionId,
        status: JobStatus.PROCESSING,
      },
    });

    try {
      const generated = await generateInterviewQuestions({
        roleTitle: jd.roleTitle,
        companyName: jd.companyName,
        seniority: jd.parsedData?.seniority ?? "unknown",
        requiredSkills: toStringArray(jd.parsedData?.requiredSkills),
        preferredSkills: toStringArray(jd.parsedData?.preferredSkills),
        rawText: jd.rawText,
        resumeContext,
      });

      await prisma.interviewQuestion.createMany({
        data: generated.map((q) => ({
          questionSetId: questionSet.id,
          category: q.category as QuestionCategory,
          prompt: q.prompt,
        })),
      });

      await prisma.interviewQuestionSet.update({
        where: { id: questionSet.id },
        data: { status: JobStatus.COMPLETED, errorMessage: null },
      });
    } catch (genErr) {
      const message = genErr instanceof Error ? genErr.message : "Generation failed";
      await prisma.interviewQuestionSet.update({
        where: { id: questionSet.id },
        data: { status: JobStatus.FAILED, errorMessage: message },
      });

      next(new AppError(502, "GENERATION_FAILED", message));
      return;
    }

    const result = await prisma.interviewQuestionSet.findUnique({
      where: { id: questionSet.id },
      include: {
        questions: {
          select: {
            id: true,
            category: true,
            prompt: true,
            answerOutline: true,
            answerGeneratedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    res.status(201).json({
      questionSet: result,
      groundedInResume: Boolean(resumeContext),
    });
  } catch (err) {
    // Race: two creates for same applicationId
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      next(
        new AppError(
          409,
          "APPLICATION_SET_EXISTS",
          "An interview set already exists for this application. Try again — it will replace the previous set.",
        ),
      );
      return;
    }
    next(err);
  }
});

// GET /interview-question-sets
interviewRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;

    const questionSets = await prisma.interviewQuestionSet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobDescriptionId: true,
        applicationId: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { questions: true } },
      },
    });

    res.json({ questionSets });
  } catch (err) {
    next(err);
  }
});

// GET /interview-question-sets/:id
interviewRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const questionSet = await prisma.interviewQuestionSet.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          select: {
            id: true,
            category: true,
            prompt: true,
            answerOutline: true,
            answerGeneratedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!questionSet || questionSet.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Interview question set not found"));
      return;
    }

    res.json({ questionSet });
  } catch (err) {
    next(err);
  }
});

// POST /interview-question-sets/:id/questions/:questionId/answer-outline
interviewRouter.post("/:id/questions/:questionId/answer-outline", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;
    const { id, questionId } = req.params;

    const questionSet = await prisma.interviewQuestionSet.findUnique({
      where: { id },
      select: {
        userId: true,
        applicationId: true,
        resumeVersionId: true,
        jobDescription: {
          select: { roleTitle: true, rawText: true },
        },
        resumeVersion: {
          select: {
            parsedData: {
              select: {
                summary: true,
                skills: true,
                experience: true,
                projects: true,
                education: true,
              },
            },
          },
        },
        application: {
          select: {
            resumeVersion: {
              select: {
                parsedData: {
                  select: {
                    summary: true,
                    skills: true,
                    experience: true,
                    projects: true,
                    education: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!questionSet || questionSet.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Interview question set not found"));
      return;
    }

    const question = await prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        questionSetId: true,
        category: true,
        prompt: true,
        answerOutline: true,
        answerGeneratedAt: true,
      },
    });

    if (!question || question.questionSetId !== id) {
      next(new AppError(404, "NOT_FOUND", "Interview question not found"));
      return;
    }

    if (question.answerOutline) {
      res.json({ question });
      return;
    }

    const resumeContext = buildResumeContext(
      questionSet.resumeVersion?.parsedData ??
        questionSet.application?.resumeVersion?.parsedData ??
        null,
    );

    try {
      const outline = await generateAnswerOutline({
        question: question.prompt,
        category: question.category,
        roleTitle: questionSet.jobDescription.roleTitle,
        rawText: questionSet.jobDescription.rawText,
        resumeContext,
      });

      const updated = await prisma.interviewQuestion.update({
        where: { id: questionId },
        data: {
          answerOutline: outline,
          answerGeneratedAt: new Date(),
        },
        select: {
          id: true,
          category: true,
          prompt: true,
          answerOutline: true,
          answerGeneratedAt: true,
          createdAt: true,
        },
      });

      res.json({ question: updated });
    } catch (genErr) {
      const message = genErr instanceof Error ? genErr.message : "Outline generation failed";
      next(new AppError(502, "GENERATION_FAILED", message));
    }
  } catch (err) {
    next(err);
  }
});
