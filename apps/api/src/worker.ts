import { Worker } from "bullmq";
import { env } from "./config/env.js";
import { runJobParse, runResumeParse } from "./lib/parseService.js";
import {
  PARSE_QUEUE_NAME,
  redisConnection,
  type JobDescriptionParseJob,
  type ResumeParseJob,
} from "./lib/queue.js";

console.log(`Parse worker starting (Redis: ${env.REDIS_URL})`);

const worker = new Worker(
  PARSE_QUEUE_NAME,
  async (job) => {
    if (job.name === "resume") {
      const { resumeVersionId } = job.data as ResumeParseJob;
      await runResumeParse(resumeVersionId);
      return;
    }

    if (job.name === "job") {
      const { jobDescriptionId } = job.data as JobDescriptionParseJob;
      await runJobParse(jobDescriptionId);
      return;
    }

    throw new Error(`Unknown parse job type: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Parse job completed: ${job.name} ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Parse job failed: ${job?.name} ${job?.id}`, err.message);
});

async function shutdown() {
  console.log("Parse worker shutting down…");
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

console.log("Parse worker ready");
