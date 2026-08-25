import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { computeMatchScore, type ResumeEntities, type JdEntities } from "../lib/scoring.js";
import { generateRecommendations } from "../lib/recommendations.js";
import { generateBulletRewrite } from "../lib/aiClient.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { createMatchAnalysisSchema } from "../validators/matchAnalysis.js";

export const matchAnalysesRouter = Router();

matchAnalysesRouter.use(requireAuth);

// POST /match-analyses — run scoring on a resume + JD pair
matchAnalysesRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;
    const body = createMatchAnalysisSchema.parse(req.body);

    // Verify ownership of both resume and JD
    const [resume, jd] = await Promise.all([
      prisma.resumeVersion.findUnique({
        where: { id: body.resumeVersionId },
        select: { userId: true, parsedData: true },
      }),
      prisma.jobDescription.findUnique({
        where: { id: body.jobDescriptionId },
        select: { userId: true, parsedData: true },
      }),
    ]);

    if (!resume || resume.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Resume not found"));
      return;
    }

    if (!jd || jd.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Job description not found"));
      return;
    }

    // Extract entities from parsed data (or fall back to empty if not parsed yet)
    const resumeEntities = extractResumeEntities(resume.parsedData);
    const jdEntities = extractJdEntities(jd.parsedData);

    if (!resumeEntities) {
      next(
        new AppError(
          422,
          "RESUME_NOT_PARSED",
          "Resume has not been parsed yet. Upload and wait for parsing to complete, or manually add parsed data.",
        ),
      );
      return;
    }

    if (!jdEntities) {
      next(
        new AppError(
          422,
          "JD_NOT_PARSED",
          "Job description has not been parsed yet. Parsing will be available once the AI service is connected.",
        ),
      );
      return;
    }

    // Run deterministic scoring
    const score = computeMatchScore(resumeEntities, jdEntities);

    // Generate recommendations
    const recs = generateRecommendations(
      score,
      jdEntities.keywords,
      [...resumeEntities.skills, ...resumeEntities.keywords],
    );

    // Store analysis + recommendations in a transaction
    const analysis = await prisma.$transaction(async (tx) => {
      const created = await tx.matchAnalysis.create({
        data: {
          userId,
          resumeVersionId: body.resumeVersionId,
          jobDescriptionId: body.jobDescriptionId,
          overallScore: score.overallScore,
          mustHaveScore: score.mustHaveScore,
          preferredScore: score.preferredScore,
          keywordScore: score.keywordScore,
          seniorityScore: score.seniorityScore,
          matchedSkills: score.matchedSkills,
          missingMustHave: score.missingMustHave,
          missingPreferred: score.missingPreferred,
          keywordCoverage: score.keywordCoverage,
          status: "COMPLETED",
        },
      });

      if (recs.length > 0) {
        await tx.matchRecommendation.createMany({
          data: recs.map((r) => ({
            matchAnalysisId: created.id,
            type: r.type,
            severity: r.severity,
            title: r.title,
            detail: r.detail,
            evidence: (r.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
          })),
        });
      }

      return created;
    });

    // Fetch the full result with recommendations
    const result = await prisma.matchAnalysis.findUnique({
      where: { id: analysis.id },
      include: {
        recommendations: {
          select: {
            id: true,
            type: true,
            severity: true,
            title: true,
            detail: true,
            evidence: true,
          },
        },
      },
    });

    res.status(201).json({ analysis: result });
  } catch (err) {
    next(err);
  }
});

// GET /match-analyses — list all analyses for current user
matchAnalysesRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;

    const analyses = await prisma.matchAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        resumeVersionId: true,
        jobDescriptionId: true,
        overallScore: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({ analyses });
  } catch (err) {
    next(err);
  }
});

// GET /match-analyses/:id — full analysis with score breakdown + recommendations
matchAnalysesRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const analysis = await prisma.matchAnalysis.findUnique({
      where: { id: req.params.id },
      include: {
        recommendations: {
          select: {
            id: true,
            type: true,
            severity: true,
            title: true,
            detail: true,
            evidence: true,
          },
        },
      },
    });

    if (!analysis || analysis.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Analysis not found"));
      return;
    }

    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// POST /match-analyses/:id/rewrite-bullets — rewrite resume bullets to match the JD
matchAnalysesRouter.post("/:id/rewrite-bullets", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const analysis = await prisma.matchAnalysis.findUnique({
      where: { id: req.params.id },
      select: { userId: true, resumeVersionId: true, jobDescriptionId: true },
    });

    if (!analysis || analysis.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Analysis not found"));
      return;
    }

    const [resume, jd] = await Promise.all([
      prisma.resumeVersion.findUnique({
        where: { id: analysis.resumeVersionId },
        select: { parsedData: true },
      }),
      prisma.jobDescription.findUnique({
        where: { id: analysis.jobDescriptionId },
        select: { roleTitle: true, parsedData: true },
      }),
    ]);

    const parsedResume = resume?.parsedData as
      | { experience?: unknown }
      | null
      | undefined;
    const parsedJd = jd?.parsedData as
      | {
          requiredSkills?: unknown;
          preferredSkills?: unknown;
          keywords?: unknown;
        }
      | null
      | undefined;

    const experience = Array.isArray(parsedResume?.experience)
      ? (parsedResume.experience as Array<{
          title?: string;
          company?: string;
          bullets?: Array<{ text?: string } | string>;
        }>)
          .map((exp) => ({
            title: exp.title,
            company: exp.company,
            bullets: (exp.bullets ?? [])
              .map((b) => (typeof b === "string" ? b : b?.text))
              .filter((t): t is string => Boolean(t?.trim())),
          }))
          .filter((exp) => exp.bullets.length > 0)
      : [];

    try {
      const suggestions = await generateBulletRewrite({
        roleTitle: jd?.roleTitle ?? "the role",
        requiredSkills: toStringArray(parsedJd?.requiredSkills),
        preferredSkills: toStringArray(parsedJd?.preferredSkills),
        keywords: toStringArray(parsedJd?.keywords),
        experience,
      });
      res.json({ suggestions });
    } catch (genErr) {
      const message =
        genErr instanceof Error ? genErr.message : "Bullet rewrite generation failed";
      next(new AppError(502, "GENERATION_FAILED", message));
    }
  } catch (err) {
    next(err);
  }
});

// --- Entity extraction helpers ---

function extractResumeEntities(
  parsedData: {
    skills: unknown;
    experience: unknown;
    summary?: unknown;
    projects?: unknown;
    certifications?: unknown;
    rawExtract?: unknown;
  } | null,
): ResumeEntities | null {
  if (!parsedData) return null;

  const skills = Array.isArray(parsedData.skills)
    ? (parsedData.skills as string[]).filter((s) => typeof s === "string" && s.trim())
    : [];

  const keywords: string[] = [...skills];

  if (typeof parsedData.summary === "string") {
    keywords.push(parsedData.summary);
  }

  if (Array.isArray(parsedData.experience)) {
    for (const exp of parsedData.experience as Array<{
      title?: string;
      company?: string;
      bullets?: Array<{ text?: string }>;
    }>) {
      if (typeof exp.title === "string") keywords.push(exp.title);
      if (typeof exp.company === "string") keywords.push(exp.company);
      if (Array.isArray(exp.bullets)) {
        for (const b of exp.bullets) {
          if (typeof b.text === "string") keywords.push(b.text);
        }
      }
    }
  }

  for (const field of ["projects", "certifications"] as const) {
    const items = parsedData[field];
    if (Array.isArray(items)) {
      for (const item of items as Array<{ text?: string } | string>) {
        if (typeof item === "string") keywords.push(item);
        else if (item && typeof item.text === "string") keywords.push(item.text);
      }
    }
  }

  const raw = parsedData.rawExtract;
  if (raw && typeof raw === "object" && raw !== null && "fullText" in raw) {
    const fullText = (raw as { fullText?: unknown }).fullText;
    if (typeof fullText === "string" && fullText.trim()) {
      keywords.push(fullText);
    }
  }

  return {
    skills,
    keywords,
    seniority: "unknown",
  };
}

function extractJdEntities(
  parsedData: {
    requiredSkills: unknown;
    preferredSkills: unknown;
    keywords: unknown;
    seniority: unknown;
  } | null,
): JdEntities | null {
  if (!parsedData) return null;

  return {
    requiredSkills: toStringArray(parsedData.requiredSkills),
    preferredSkills: toStringArray(parsedData.preferredSkills),
    keywords: toStringArray(parsedData.keywords),
    seniority: typeof parsedData.seniority === "string" ? parsedData.seniority : "unknown",
  };
}

function toStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : [];
}
