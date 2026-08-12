import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { resumesRouter } from "./routes/resumes.js";
import { jobDescriptionsRouter } from "./routes/jobDescriptions.js";
import { matchAnalysesRouter } from "./routes/matchAnalyses.js";
import { applicationsRouter } from "./routes/applications.js";
import { interviewRouter } from "./routes/interview.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/resumes", resumesRouter);
app.use("/job-descriptions", jobDescriptionsRouter);
app.use("/match-analyses", matchAnalysesRouter);
app.use("/applications", applicationsRouter);
app.use("/interview-question-sets", interviewRouter);

// Phase 5 backend core complete — frontend next (Phase 6)

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
