import { JobStatus } from "@prisma/client";
import { Router } from "express";
import { enqueueJobDescriptionParse } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import {
  createJobDescriptionSchema,
  updateJobDescriptionSchema,
} from "../validators/jobDescriptions.js";

export const jobDescriptionsRouter = Router();

jobDescriptionsRouter.use(requireAuth);

// POST /job-descriptions — paste a new JD, then auto-parse
jobDescriptionsRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;
    const body = createJobDescriptionSchema.parse(req.body);

    const jd = await prisma.jobDescription.create({
      data: {
        userId,
        companyName: body.companyName,
        roleTitle: body.roleTitle,
        sourceUrl: body.sourceUrl || null,
        rawText: body.rawText,
        parseStatus: JobStatus.PENDING,
      },
    });

    await prisma.jobDescription.update({
      where: { id: jd.id },
      data: { parseStatus: JobStatus.PROCESSING },
    });

    await enqueueJobDescriptionParse(jd.id);

    const result = await prisma.jobDescription.findUnique({
      where: { id: jd.id },
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        sourceUrl: true,
        parseStatus: true,
        parseError: true,
        createdAt: true,
        parsedData: {
          select: {
            requiredSkills: true,
            preferredSkills: true,
            keywords: true,
            seniority: true,
          },
        },
      },
    });

    res.status(201).json({ jobDescription: result });
  } catch (err) {
    next(err);
  }
});

// GET /job-descriptions — list all JDs for current user
jobDescriptionsRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;

    const jobDescriptions = await prisma.jobDescription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        sourceUrl: true,
        parseStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ jobDescriptions });
  } catch (err) {
    next(err);
  }
});

// GET /job-descriptions/:id — single JD with full raw text + parsed data
jobDescriptionsRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const jd = await prisma.jobDescription.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        companyName: true,
        roleTitle: true,
        sourceUrl: true,
        rawText: true,
        parseStatus: true,
        parseError: true,
        createdAt: true,
        updatedAt: true,
        parsedData: true,
      },
    });

    if (!jd || jd.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Job description not found"));
      return;
    }

    const { userId: _uid, ...rest } = jd;
    res.json({ jobDescription: rest });
  } catch (err) {
    next(err);
  }
});

// PATCH /job-descriptions/:id — edit JD fields (re-parse if rawText changes)
jobDescriptionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;
    const body = updateJobDescriptionSchema.parse(req.body);

    const existing = await prisma.jobDescription.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Job description not found"));
      return;
    }

    const updated = await prisma.jobDescription.update({
      where: { id: req.params.id },
      data: {
        ...(body.companyName !== undefined && { companyName: body.companyName }),
        ...(body.roleTitle !== undefined && { roleTitle: body.roleTitle }),
        ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl || null }),
        ...(body.rawText !== undefined && { rawText: body.rawText }),
      },
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        sourceUrl: true,
        rawText: true,
        parseStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (body.rawText !== undefined) {
      await prisma.jobDescription.update({
        where: { id: req.params.id },
        data: { parseStatus: JobStatus.PROCESSING, parseError: null },
      });

      await enqueueJobDescriptionParse(req.params.id);

      const refreshed = await prisma.jobDescription.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          companyName: true,
          roleTitle: true,
          sourceUrl: true,
          rawText: true,
          parseStatus: true,
          parseError: true,
          createdAt: true,
          updatedAt: true,
          parsedData: {
            select: {
              requiredSkills: true,
              preferredSkills: true,
              keywords: true,
              seniority: true,
            },
          },
        },
      });

      res.json({ jobDescription: refreshed });
      return;
    }

    res.json({ jobDescription: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /job-descriptions/:id — hard delete (only if no linked analyses/applications)
jobDescriptionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const existing = await prisma.jobDescription.findUnique({
      where: { id: req.params.id },
      select: {
        userId: true,
        _count: {
          select: {
            matchAnalyses: true,
            applications: true,
          },
        },
      },
    });

    if (!existing || existing.userId !== userId) {
      next(new AppError(404, "NOT_FOUND", "Job description not found"));
      return;
    }

    if (existing._count.matchAnalyses > 0 || existing._count.applications > 0) {
      next(
        new AppError(
          409,
          "HAS_DEPENDENTS",
          "Cannot delete a job description linked to analyses or applications",
        ),
      );
      return;
    }

    await prisma.jobDescription.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
