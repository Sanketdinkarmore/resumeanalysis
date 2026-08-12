import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export const storage = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

let bucketReadyPromise: Promise<void> | null = null;

export function ensureResumeBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      try {
        await storage.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
      } catch {
        await storage.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      }
    })();
  }

  return bucketReadyPromise;
}

export async function uploadResumePdf(params: {
  userId: string;
  originalFilename: string;
  mimeType: string;
  body: Buffer;
}) {
  await ensureResumeBucket();

  const objectKey = `${params.userId}/${randomUUID()}-${sanitizeFilename(params.originalFilename)}`;

  await storage.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: objectKey,
      Body: params.body,
      ContentType: params.mimeType,
    }),
  );

  return { objectKey };
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}
