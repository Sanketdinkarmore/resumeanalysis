import { JobStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import multer from "multer";
import { Router } from "express";
import { parseResumePdf } from "../lib/aiClient.js";
import { prisma } from "../lib/prisma.js";
import { uploadResumePdf } from "../lib/storage.js";
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

      // Trigger parse (sync for v1 — background queue comes in Phase 7)
      await prisma.resumeVersion.update({
        where: { id: resume.id },
        data: { parseStatus: JobStatus.PROCESSING },
      });

      try {
        const parsed = await parseResumePdf(file.buffer, file.originalname);

        await prisma.parsedResumeData.create({
          data: {
            resumeVersionId: resume.id,
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
          where: { id: resume.id },
          data: { parseStatus: JobStatus.COMPLETED, parseError: null },
        });
      } catch (parseErr) {
        const message = parseErr instanceof Error ? parseErr.message : "Parse failed";
        await prisma.resumeVersion.update({
          where: { id: resume.id },
          data: { parseStatus: JobStatus.FAILED, parseError: message },
        });
      }

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

function parseTags(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
