import type { ScoreBreakdown } from "./scoring.js";

interface Recommendation {
  type: "ADD_SKILL" | "ADD_KEYWORD" | "IMPROVE_BULLET" | "CLARIFY_EXPERIENCE" | "OTHER";
  severity: "INFO" | "WARN" | "CRITICAL";
  title: string;
  detail: string;
  evidence: Record<string, unknown> | null;
}

export function generateRecommendations(
  score: ScoreBreakdown,
  jdKeywords: string[],
  resumeKeywords: string[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  const resumeNorm = new Set(resumeKeywords.map((k) => k.toLowerCase().trim()));

  for (const skill of score.missingMustHave) {
    recs.push({
      type: "ADD_SKILL",
      severity: "CRITICAL",
      title: `Add required skill: ${skill}`,
      detail: `"${skill}" is listed as a required skill in the JD but is absent from your resume.`,
      evidence: { source: "required_skills", skill },
    });
  }

  for (const skill of score.missingPreferred) {
    recs.push({
      type: "ADD_SKILL",
      severity: "WARN",
      title: `Consider adding: ${skill}`,
      detail: `"${skill}" is a preferred skill in the JD. Add it if you have genuine experience.`,
      evidence: { source: "preferred_skills", skill },
    });
  }

  const missingKeywords = jdKeywords.filter(
    (k) => !resumeNorm.has(k.toLowerCase().trim()),
  );
  for (const keyword of missingKeywords.slice(0, 5)) {
    recs.push({
      type: "ADD_KEYWORD",
      severity: "INFO",
      title: `Missing keyword: ${keyword}`,
      detail: `The keyword "${keyword}" appears in the JD but not in your resume.`,
      evidence: { source: "keywords", keyword },
    });
  }

  if (score.overallScore < 40) {
    recs.push({
      type: "OTHER",
      severity: "CRITICAL",
      title: "Low overall match",
      detail:
        "Your resume matches less than 40% of this role. Consider whether this role aligns with your experience, or tailor your resume significantly.",
      evidence: { overallScore: score.overallScore },
    });
  }

  return recs;
}
