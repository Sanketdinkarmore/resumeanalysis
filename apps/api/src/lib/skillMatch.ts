/**
 * Skill / keyword matching helpers for deterministic scoring.
 *
 * Problem we solve:
 *   JD says "React.js" / "RESTful APIs" / "AWS EC2"
 *   Resume has "React" / "REST" / "AWS" + "EC2"
 *   Exact string match fails → false "missing" skills and low score.
 *
 * Rules stay deterministic: same inputs → same match decisions.
 */

/** Map common variants to a single canonical token. */
const ALIASES: Record<string, string> = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "next.js",
  nextjs: "next.js",
  "node.js": "node.js",
  nodejs: "node.js",
  node: "node.js",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "vue.js": "vue",
  vuejs: "vue",
  "angular.js": "angular",
  "restful apis": "rest",
  "restful api": "rest",
  "rest apis": "rest",
  "rest api": "rest",
  "rest api design": "rest",
  rest: "rest",
  "jwt authentication": "jwt",
  jwt: "jwt",
  html5: "html",
  html: "html",
  css3: "css",
  css: "css",
  "tailwind css": "tailwind",
  tailwind: "tailwind",
  "ci/cd": "ci/cd",
  cicd: "ci/cd",
  "continuous integration": "ci/cd",
  "github actions": "github actions",
  github: "github",
  git: "git",
  mongodb: "mongodb",
  mongo: "mongodb",
  postgresql: "postgresql",
  postgres: "postgresql",
  "psql": "postgresql",
  "oracle database": "oracle",
  typescript: "typescript",
  javascript: "javascript",
  "javascript (es6+)": "javascript",
  es6: "javascript",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  aws: "aws",
  ec2: "ec2",
  s3: "s3",
  lambda: "lambda",
  rds: "rds",
  cloudfront: "cloudfront",
  "amazon web services": "aws",
  microservices: "microservices",
  "full stack": "full stack",
  fullstack: "full stack",
  "full-stack": "full stack",
  mern: "mern",
  agile: "agile",
  "agile development": "agile",
  "role-based access control": "rbac",
  rbac: "rbac",
  containerization: "docker",
  containerize: "docker",
  authentication: "authentication",
  authorization: "authorization",
  production: "production",
  deployment: "deployment",
  testing: "testing",
};

/** Compound JD skills satisfied if ALL parts are present (or the full phrase). */
const COMPOUND_PARTS: Record<string, string[]> = {
  "aws ec2": ["aws", "ec2"],
  "aws s3": ["aws", "s3"],
  "aws lambda": ["aws", "lambda"],
  "aws rds": ["aws", "rds"],
  "aws cloudfront": ["aws", "cloudfront"],
  "git and github": ["git", "github"],
  "ci/cd with github actions": ["ci/cd", "github actions"],
};

export function canonicalize(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w.+#/\- ]+/g, "") // keep . + # / - for c++, ci/cd, etc.
    .trim();

  if (!cleaned) return "";
  if (ALIASES[cleaned]) return ALIASES[cleaned];

  // Strip trailing parenthetical fragments: "javascript (es6+" → try base
  const withoutParen = cleaned.replace(/\s*\(.*$/, "").trim();
  if (withoutParen && ALIASES[withoutParen]) return ALIASES[withoutParen];

  return withoutParen || cleaned;
}

/** Expand a resume skill bag with aliases and useful implications. */
export function buildResumeSkillSet(skills: string[]): Set<string> {
  const set = new Set<string>();

  for (const skill of skills) {
    const canon = canonicalize(skill);
    if (!canon) continue;
    set.add(canon);

    // Split glued garbage like "css3 node.js" into parts
    for (const part of skill.split(/[\s,/|]+/)) {
      const p = canonicalize(part);
      if (p) set.add(p);
    }
  }

  // Soft implications (ATS-friendly, still deterministic)
  if (set.has("git")) set.add("github"); // resume with Git usually implies GitHub workflow
  if (set.has("github")) set.add("git");
  if (set.has("react")) set.add("react.js");
  if (set.has("express")) set.add("express.js");
  if (set.has("rest")) {
    set.add("restful apis");
    set.add("rest apis");
  }
  if (set.has("docker")) set.add("containerization");

  return set;
}

/**
 * Does the resume skill set satisfy a JD skill string?
 * Uses aliases + compound part matching.
 */
export function skillMatches(jdSkill: string, resumeSet: Set<string>): boolean {
  const raw = jdSkill.toLowerCase().trim();
  const canon = canonicalize(jdSkill);
  if (!canon) return false;

  if (resumeSet.has(canon) || resumeSet.has(raw)) return true;

  // Compound: "AWS EC2" → need aws + ec2 (or exact phrase)
  const parts = COMPOUND_PARTS[raw] ?? COMPOUND_PARTS[canon];
  if (parts && parts.length > 1) {
    if (parts.every((p) => resumeSet.has(canonicalize(p)) || resumeSet.has(p))) {
      return true;
    }
  }

  // Resume skill may be a longer phrase that contains the JD skill
  // (e.g. resume "jwt authentication" covers jd "jwt")
  // Do NOT reverse-match short resume tokens into longer JD skills
  // (e.g. resume "github" must NOT satisfy jd "github actions")
  for (const resumeSkill of resumeSet) {
    if (resumeSkill.length < 3) continue;
    if (resumeSkill === canon) return true;
    if (resumeSkill.includes(canon) && resumeSkill.length >= canon.length) return true;
  }

  return false;
}

export function keywordMatches(jdKeyword: string, resumeBag: string[]): boolean {
  const bag = buildResumeSkillSet(resumeBag);
  // Also add raw lowercased phrases for multi-word keywords
  for (const item of resumeBag) {
    bag.add(item.toLowerCase().trim());
  }

  if (skillMatches(jdKeyword, bag)) return true;

  const needle = jdKeyword.toLowerCase().trim();
  return resumeBag.some((hay) => {
    const h = hay.toLowerCase();
    return h.includes(needle) || needle.includes(h);
  });
}
