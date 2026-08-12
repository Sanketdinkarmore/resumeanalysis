/**
 * Deterministic match-scoring engine.
 *
 * This is the core business logic of the platform.
 * The LLM/NLP service extracts entities; this module scores them.
 * Same inputs always produce the same output — no AI randomness here.
 *
 * Formula (v1 weights — tunable later):
 *   score = 0.45 * mustHaveOverlap
 *         + 0.20 * preferredOverlap
 *         + 0.20 * keywordCoverage
 *         + 0.15 * seniorityAlignment
 */

import {
  buildResumeSkillSet,
  keywordMatches,
  skillMatches,
} from "./skillMatch.js";

export interface ResumeEntities {
  skills: string[];
  keywords: string[];
  seniority: string;
}

export interface JdEntities {
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  seniority: string;
}

export interface ScoreBreakdown {
  overallScore: number;
  mustHaveScore: number;
  preferredScore: number;
  keywordScore: number;
  seniorityScore: number;
  keywordCoverage: number;
  matchedSkills: string[];
  missingMustHave: string[];
  missingPreferred: string[];
}

const WEIGHTS = {
  mustHave: 0.45,
  preferred: 0.2,
  keyword: 0.2,
  seniority: 0.15,
} as const;

export function computeMatchScore(
  resume: ResumeEntities,
  jd: JdEntities,
): ScoreBreakdown {
  const resumeSet = buildResumeSkillSet(resume.skills);
  // Keywords bag = skills + extracted keywords/phrases from resume text
  const resumeKeywordBag = [...resume.skills, ...resume.keywords];

  const matchedMustHave = jd.requiredSkills.filter((s) => skillMatches(s, resumeSet));
  const missingMustHave = jd.requiredSkills.filter((s) => !skillMatches(s, resumeSet));
  const mustHaveScore =
    jd.requiredSkills.length > 0
      ? matchedMustHave.length / jd.requiredSkills.length
      : 1;

  const matchedPreferred = jd.preferredSkills.filter((s) => skillMatches(s, resumeSet));
  const missingPreferred = jd.preferredSkills.filter((s) => !skillMatches(s, resumeSet));
  const preferredScore =
    jd.preferredSkills.length > 0
      ? matchedPreferred.length / jd.preferredSkills.length
      : 1;

  const matchedSkills = [
    ...matchedMustHave,
    ...matchedPreferred.filter(
      (s) => !matchedMustHave.some((m) => m.toLowerCase() === s.toLowerCase()),
    ),
  ];

  const coveredKeywords = jd.keywords.filter((k) =>
    keywordMatches(k, resumeKeywordBag),
  );
  const keywordScore =
    jd.keywords.length > 0 ? coveredKeywords.length / jd.keywords.length : 1;

  const seniorityScore = computeSeniorityAlignment(resume.seniority, jd.seniority);

  const overallScore = round(
    100 *
      (WEIGHTS.mustHave * mustHaveScore +
        WEIGHTS.preferred * preferredScore +
        WEIGHTS.keyword * keywordScore +
        WEIGHTS.seniority * seniorityScore),
  );

  return {
    overallScore,
    mustHaveScore: round(mustHaveScore * 100),
    preferredScore: round(preferredScore * 100),
    keywordScore: round(keywordScore * 100),
    seniorityScore: round(seniorityScore * 100),
    keywordCoverage: round(keywordScore * 100),
    matchedSkills,
    missingMustHave,
    missingPreferred,
  };
}

const SENIORITY_LEVELS: Record<string, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  staff: 5,
  principal: 6,
};

function computeSeniorityAlignment(resumeLevel: string, jdLevel: string): number {
  const r = SENIORITY_LEVELS[resumeLevel.toLowerCase()] ?? -1;
  const j = SENIORITY_LEVELS[jdLevel.toLowerCase()] ?? -1;

  if (r === -1 || j === -1) return 0.5; // unknown → neutral

  const gap = Math.abs(r - j);
  if (gap === 0) return 1.0;
  if (gap === 1) return 0.7;
  if (gap === 2) return 0.3;
  return 0.0;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
