import { ApplicationStage } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import {
  createApplicationSchema,
  listApplicationsQuerySchema,
  updateApplicationNotesSchema,
  updateApplicationStageSchema,
} from "../validators/applications.js";

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

// POST /applications — track a new job application
applicationsRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;
    const body = createApplicationSchema.parse(req.body);

    const [resume, jd, matchAnalysis] = await Promise.all([
      prisma.resumeVersion.findUnique({
        where: { id: body.resumeVersionId },
        select: { userId: true, deletedAt: true },
      }),
      prisma.jobDescription.findUnique({
        where: { id: body.jobDescriptionId },
        select: { userId: true, companyName: true, roleTitle: true },
      }),
      body.matchAnalysisId
        ? prisma.matchAnalysis.findUnique({
            where: { id: body.matchAnalysisId },
            select: {
              userId: true,
              resumeVersionId: true,
              jobDescriptionId: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!resume || resume.userId !== userId || resume.deletedAt) {
      next(new AppError(404, "NOT_FOUND", "Resume not found"));
      return;
    }

    if (!jd || jd.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Job description not found"));
      return;
    }

    if (body.matchAnalysisId) {
      if (!matchAnalysis || matchAnalysis.userId !== userId) {
        next(new AppError(404, "NOT_FOUND", "Match analysis not found"));
        return;
      }

      if (
        matchAnalysis.resumeVersionId !== body.resumeVersionId ||
        matchAnalysis.jobDescriptionId !== body.jobDescriptionId
      ) {
        next(
          new AppError(
            400,
            "ANALYSIS_MISMATCH",
            "Match analysis does not belong to the given resume and job description pair",
          ),
        );
        return;
      }
    }

    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          userId,
          resumeVersionId: body.resumeVersionId,
          jobDescriptionId: body.jobDescriptionId,
          matchAnalysisId: body.matchAnalysisId ?? null,
          companyName: jd.companyName,
          roleTitle: jd.roleTitle,
          notes: body.notes ?? null,
          stage: ApplicationStage.SAVED,
        },
        select: {
          id: true,
          resumeVersionId: true,
          jobDescriptionId: true,
          matchAnalysisId: true,
          companyName: true,
          roleTitle: true,
          stage: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.applicationStageHistory.create({
        data: {
          applicationId: created.id,
          fromStage: null,
          toStage: ApplicationStage.SAVED,
          note: "Application created",
        },
      });

      return created;
    });

    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
});

// GET /applications — list with optional filter/search/sort
applicationsRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;
    const query = listApplicationsQuerySchema.parse(req.query);

    const applications = await prisma.application.findMany({
      where: {
        userId,
        ...(query.stage && { stage: query.stage }),
        ...(query.search && {
          OR: [
            { companyName: { contains: query.search, mode: "insensitive" } },
            { roleTitle: { contains: query.search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { [query.sort]: query.order },
      select: {
        id: true,
        resumeVersionId: true,
        jobDescriptionId: true,
        matchAnalysisId: true,
        companyName: true,
        roleTitle: true,
        stage: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ applications });
  } catch (err) {
    next(err);
  }
});

// GET /applications/:id — single application with stage history
applicationsRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        resumeVersionId: true,
        jobDescriptionId: true,
        matchAnalysisId: true,
        companyName: true,
        roleTitle: true,
        stage: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        stageHistory: {
          orderBy: { changedAt: "asc" },
          select: {
            id: true,
            fromStage: true,
            toStage: true,
            note: true,
            changedAt: true,
          },
        },
      },
    });

    if (!application || application.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Application not found"));
      return;
    }

    const { userId: _uid, ...rest } = application;
    res.json({ application: rest });
  } catch (err) {
    next(err);
  }
});

// PATCH /applications/:id — update notes only
applicationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;
    const body = updateApplicationNotesSchema.parse(req.body);

    const existing = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Application not found"));
      return;
    }

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { notes: body.notes },
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        stage: true,
        notes: true,
        updatedAt: true,
      },
    });

    res.json({ application });
  } catch (err) {
    next(err);
  }
});

// PATCH /applications/:id/stage — move to a new stage (logged in history)
applicationsRouter.patch("/:id/stage", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;
    const body = updateApplicationStageSchema.parse(req.body);

    const existing = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: { userId: true, stage: true },
    });

    if (!existing || existing.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Application not found"));
      return;
    }

    if (existing.stage === body.stage) {
      next(new AppError(400, "SAME_STAGE", "Application is already in this stage"));
      return;
    }

    const application = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: req.params.id },
        data: { stage: body.stage },
        select: {
          id: true,
          companyName: true,
          roleTitle: true,
          stage: true,
          updatedAt: true,
        },
      });

      await tx.applicationStageHistory.create({
        data: {
          applicationId: req.params.id,
          fromStage: existing.stage,
          toStage: body.stage,
          note: body.note ?? null,
        },
      });

      return updated;
    });

    res.json({ application });
  } catch (err) {
    next(err);
  }
});

// DELETE /applications/:id
applicationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const existing = await prisma.application.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Application not found"));
      return;
    }

    await prisma.application.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
