import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";

export const PARSE_QUEUE_NAME = "parse-jobs";

export type ResumeParseJob = {
  resumeVersionId: string;
};

export type JobDescriptionParseJob = {
  jobDescriptionId: string;
};

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const parseQueue = new Queue(PARSE_QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueResumeParse(resumeVersionId: string) {
  await parseQueue.add(
    "resume",
    { resumeVersionId } satisfies ResumeParseJob,
    {
      jobId: `resume-${resumeVersionId}`,
      removeOnComplete: true,
      removeOnFail: 200,
    },
  );
}

export async function enqueueJobDescriptionParse(jobDescriptionId: string) {
  await parseQueue.add(
    "job",
    { jobDescriptionId } satisfies JobDescriptionParseJob,
    {
      jobId: `job-${jobDescriptionId}`,
      removeOnComplete: true,
      removeOnFail: 200,
    },
  );
}
