import { JobStatus } from "@prisma/client";
import multer from "multer";
import { Router } from "express";
import { uploadResumePdf } from "../lib/storage.js";
import { enqueueResumeParse } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_SIZE_BYTES,
  },
});

export const resumesRouter = Router();

resumesRouter.use(requireAuth);

resumesRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).user.sub;

    const resumes = await prisma.resumeVersion.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        tags: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        parseStatus: true,
        parseError: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ resumes });
  } catch (err) {
    next(err);
  }
});

// GET /resumes/:id — resume metadata + parsed data
resumesRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const resume = await prisma.resumeVersion.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        name: true,
        tags: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        parseStatus: true,
        parseError: true,
        archivedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        parsedData: true,
      },
    });

    if (!resume || resume.userId !== userId || resume.deletedAt) {
      next(new AppError(404, "NOT_FOUND", "Resume not found"));
      return;
    }

    const { userId: _uid, ...rest } = resume;
    res.json({ resume: rest });
  } catch (err) {
    next(err);
  }
});

resumesRouter.post("/", (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      next(new AppError(400, "FILE_TOO_LARGE", "Resume PDF must be 5MB or smaller"));
      return;
    }

    if (err) {
      next(err);
      return;
    }

    try {
      const authedReq = req as AuthedRequest;
      const userId = authedReq.user.sub;
      const file = req.file;
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      const tags = parseTags(req.body.tags);

      if (!file) {
        next(new AppError(400, "FILE_REQUIRED", "Upload a PDF file in the `file` field"));
        return;
      }

      if (file.mimetype !== "application/pdf") {
        next(new AppError(400, "INVALID_FILE_TYPE", "Only PDF resumes are supported"));
        return;
      }

      if (!name) {
        next(new AppError(400, "NAME_REQUIRED", "Resume name is required"));
        return;
      }

      const { objectKey } = await uploadResumePdf({
        userId,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        body: file.buffer,
      });

      const resume = await prisma.resumeVersion.create({
        data: {
          userId,
          name,
          tags,
          s3Key: objectKey,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          parseStatus: JobStatus.PENDING,
        },
      });

      await prisma.resumeVersion.update({
        where: { id: resume.id },
        data: { parseStatus: JobStatus.PROCESSING },
      });

      await enqueueResumeParse(resume.id);

      const result = await prisma.resumeVersion.findUnique({
        where: { id: resume.id },
        select: {
          id: true,
          name: true,
          tags: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          parseStatus: true,
          parseError: true,
          createdAt: true,
          parsedData: {
            select: {
              skills: true,
              summary: true,
              contact: true,
            },
          },
        },
      });

      res.status(201).json({ resume: result });
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

// DELETE /resumes/:id — soft delete (hidden from lists; blocks if linked)
resumesRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).user.sub;

    const existing = await prisma.resumeVersion.findUnique({
      where: { id: req.params.id },
      select: {
        userId: true,
        deletedAt: true,
        _count: {
          select: {
            matchAnalyses: true,
            applications: true,
          },
        },
      },
    });

    if (!existing || existing.userId !== userId || existing.deletedAt) {
      next(new AppError(404, "NOT_FOUND", "Resume not found"));
      return;
    }

    if (existing._count.matchAnalyses > 0 || existing._count.applications > 0) {
      next(
        new AppError(
          409,
          "HAS_DEPENDENTS",
          "Cannot delete a resume linked to matches or applications",
        ),
      );
      return;
    }

    await prisma.resumeVersion.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function parseTags(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
