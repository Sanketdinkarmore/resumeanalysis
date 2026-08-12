import { env } from "../config/env.js";

export interface ParsedResumePayload {
  contact: Record<string, unknown> | null;
  summary: string | null;
  skills: string[];
  experience: unknown[];
  education: unknown[];
  projects: unknown[];
  certifications: unknown[];
  rawExtract: Record<string, unknown> | null;
}

export interface ParsedJdPayload {
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  seniority: string;
  keywords: string[];
  rawExtract: Record<string, unknown> | null;
}

interface ParseResumeResponse {
  parsed: ParsedResumePayload;
}

interface ParseJdResponse {
  parsed: ParsedJdPayload;
}

export interface GeneratedInterviewQuestion {
  category: "TECHNICAL" | "BEHAVIORAL" | "PROJECT";
  prompt: string;
}

/** Send PDF to FastAPI for text extraction + heuristic structuring. */
export async function parseResumePdf(
  buffer: Buffer,
  filename: string,
): Promise<ParsedResumePayload> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);

  const res = await fetch(`${env.AI_SERVICE_URL}/parse/resume`, {
    method: "POST",
    headers: {
      "X-Internal-Secret": env.INTERNAL_API_SECRET,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI parse failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ParseResumeResponse;
  return data.parsed;
}

/** Send JD text to FastAPI for skill/keyword/seniority extraction. */
export async function parseJobDescription(rawText: string): Promise<ParsedJdPayload> {
  const res = await fetch(`${env.AI_SERVICE_URL}/parse/job-description`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify({ rawText }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI JD parse failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as ParseJdResponse;
  return data.parsed;
}

/** Generate JD-grounded interview questions via FastAPI/Gemini. */
export async function generateInterviewQuestions(input: {
  roleTitle: string;
  companyName?: string | null;
  seniority: string;
  requiredSkills: string[];
  preferredSkills: string[];
  rawText: string;
  resumeContext?: string | null;
}): Promise<GeneratedInterviewQuestion[]> {
  const res = await fetch(`${env.AI_SERVICE_URL}/interview/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Interview question generation failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { questions: GeneratedInterviewQuestion[] };
  return data.questions;
}

/** On-demand answer outline for one question. */
export async function generateAnswerOutline(input: {
  question: string;
  category: string;
  roleTitle: string;
  rawText: string;
  resumeContext?: string | null;
}): Promise<string> {
  const res = await fetch(`${env.AI_SERVICE_URL}/interview/answer-outline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Answer outline generation failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { answerOutline: string };
  return data.answerOutline;
}
