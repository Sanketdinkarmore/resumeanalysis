"""Generate interview questions grounded in JD + optional resume context."""

from __future__ import annotations

import logging
import re

from app.services.llm_client import generate_json, is_llm_available

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"TECHNICAL", "BEHAVIORAL", "PROJECT"}
QUESTIONS_PER_CATEGORY = 5
TOTAL_QUESTIONS = QUESTIONS_PER_CATEGORY * 3  # 15
CATEGORY_ORDER = ("TECHNICAL", "BEHAVIORAL", "PROJECT")


def generate_interview_questions(
    *,
    role_title: str,
    company_name: str | None,
    seniority: str,
    required_skills: list[str],
    preferred_skills: list[str],
    jd_text: str,
    resume_context: str | None = None,
) -> list[dict[str, str]]:
    """
    Returns list of { category, prompt }.
    Prefers Groq → Gemini → deterministic templates.
    Always returns exactly 15 questions (5 TECHNICAL, 5 BEHAVIORAL, 5 PROJECT).
    """
    has_resume = bool(resume_context and resume_context.strip())
    heuristic = _heuristic_questions(
        role_title=role_title,
        company_name=company_name,
        seniority=seniority,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        jd_text=jd_text,
        resume_context=resume_context,
    )

    if is_llm_available():
        try:
            llm_questions = _generate_with_llm(
                role_title=role_title,
                company_name=company_name,
                seniority=seniority,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                jd_text=jd_text,
                resume_context=resume_context,
                has_resume=has_resume,
            )
            if llm_questions:
                return _ensure_fifteen(llm_questions, heuristic)
            logger.warning("LLM interview generation unavailable; using template fallback")
        except Exception as exc:
            logger.warning("LLM interview generation error: %s; using template fallback", exc)

    return _ensure_fifteen(heuristic, heuristic)


def _generate_with_llm(
    *,
    role_title: str,
    company_name: str | None,
    seniority: str,
    required_skills: list[str],
    preferred_skills: list[str],
    jd_text: str,
    resume_context: str | None,
    has_resume: bool,
) -> list[dict[str, str]] | None:
    grounding = (
        "Ground questions in BOTH the job description AND the candidate resume.\n"
        "Simulate a recruiter who shortlisted this resume for this role.\n"
        "- TECHNICAL: probe JD-required skills the resume claims (ask for depth / tradeoffs)\n"
        "- BEHAVIORAL: tie soft-skill probes to real roles/internships on the resume\n"
        "- PROJECT: ask about specific projects/experience bullets from the resume, "
        "framed against this JD's needs\n"
        "Do NOT invent resume projects or metrics that are not present.\n"
        "Do NOT ask about stacks absent from both JD and resume."
        if has_resume
        else "Ground questions ONLY in the job description (no resume provided).\n"
        "Do NOT invent unrelated stacks."
    )

    project_rule = (
        f"{QUESTIONS_PER_CATEGORY} PROJECT questions that reference concrete resume "
        "projects/experience and connect them to this JD"
        if has_resume
        else f"{QUESTIONS_PER_CATEGORY} PROJECT / scenario questions tied to JD responsibilities"
    )

    resume_block = (
        f"""
CANDIDATE RESUME (parsed summary — use this):
\"\"\"
{resume_context[:7000]}
\"\"\"
"""
        if has_resume
        else "\n(No resume provided — JD-only questions.)\n"
    )

    prompt = f"""
You are an interview coach for software engineering candidates.
{grounding}

Return JSON:
{{
  "questions": [
    {{ "category": "TECHNICAL"|"BEHAVIORAL"|"PROJECT", "prompt": string }}
  ]
}}

CRITICAL — count must be exact:
- Exactly {TOTAL_QUESTIONS} items in "questions"
- Exactly {QUESTIONS_PER_CATEGORY} with category TECHNICAL
- Exactly {QUESTIONS_PER_CATEGORY} with category BEHAVIORAL
- Exactly {QUESTIONS_PER_CATEGORY} with category PROJECT
- Order them: all TECHNICAL first, then all BEHAVIORAL, then all PROJECT

Other rules:
- {project_rule}
- Cover different angles within each category (do not repeat the same question rephrased)
- Questions must feel like a real screening / interview for THIS role
- Keep each prompt to 1-2 sentences
- category must be exactly TECHNICAL, BEHAVIORAL, or PROJECT

Role: {role_title}
Company: {company_name or "N/A"}
Seniority: {seniority}
Required skills: {", ".join(required_skills) or "N/A"}
Preferred skills: {", ".join(preferred_skills) or "N/A"}

JOB DESCRIPTION:
\"\"\"
{jd_text[:7000]}
\"\"\"
{resume_block}
"""

    data = generate_json(prompt, max_output_tokens=6500)
    if not data or not isinstance(data.get("questions"), list):
        return None

    cleaned: list[dict[str, str]] = []
    for item in data["questions"]:
        if not isinstance(item, dict):
            continue
        category = str(item.get("category") or "").upper().strip()
        text = str(item.get("prompt") or "").strip()
        if category not in VALID_CATEGORIES or not text:
            continue
        cleaned.append({"category": category, "prompt": text})

    if len(cleaned) < 3:
        return None

    return cleaned


def _ensure_fifteen(
    primary: list[dict[str, str]],
    fill: list[dict[str, str]],
) -> list[dict[str, str]]:
    """Always return exactly 5 per category (15 total), preferring primary then fill."""
    buckets: dict[str, list[dict[str, str]]] = {c: [] for c in CATEGORY_ORDER}
    seen: set[str] = set()

    def _add(source: list[dict[str, str]]) -> None:
        for q in source:
            cat = q.get("category", "").upper()
            prompt = (q.get("prompt") or "").strip()
            if cat not in buckets or not prompt:
                continue
            if len(buckets[cat]) >= QUESTIONS_PER_CATEGORY:
                continue
            key = prompt.lower()
            if key in seen:
                continue
            seen.add(key)
            buckets[cat].append({"category": cat, "prompt": prompt})

    _add(primary)
    _add(fill)

    # Last-resort generic pads if a category is still short
    for cat in CATEGORY_ORDER:
        i = 1
        while len(buckets[cat]) < QUESTIONS_PER_CATEGORY:
            prompt = f"Additional {cat.lower()} question {i} for this role — walk through a relevant example."
            key = prompt.lower()
            if key not in seen:
                seen.add(key)
                buckets[cat].append({"category": cat, "prompt": prompt})
            i += 1

    out: list[dict[str, str]] = []
    for cat in CATEGORY_ORDER:
        out.extend(buckets[cat][:QUESTIONS_PER_CATEGORY])
    return out


def _heuristic_questions(
    *,
    role_title: str,
    company_name: str | None,
    seniority: str,
    required_skills: list[str],
    preferred_skills: list[str],
    jd_text: str,
    resume_context: str | None,
) -> list[dict[str, str]]:
    """Deterministic questions so interview prep still works without an LLM."""
    company = (company_name or "the company").strip() or "the company"
    skills = [s.strip() for s in required_skills if s and s.strip()][:8]
    if len(skills) < 5:
        skills.extend([s.strip() for s in preferred_skills if s and s.strip()])
    skills = _dedupe(skills)[:8]
    while len(skills) < 5:
        skills.append(f"core skills for {role_title}")

    projects = _extract_resume_lines(resume_context, "Projects")
    experience = _extract_resume_lines(resume_context, "Experience")
    anchors = projects or experience
    while len(anchors) < 5:
        anchors.append(f"a recent project relevant to {role_title}")

    keywords = _jd_keywords(jd_text)
    skill0 = keywords[0] if keywords and "core skills" in skills[0] else skills[0]

    tech = [
        f"Walk me through how you would design a solution for the {role_title} role at {company} using {skill0}.",
        f"What tradeoffs have you made when using {skills[1]} in production, and how would that apply here?",
        f"How would you debug a production issue involving {skills[2]} in a system like the one described in this JD?",
        f"How would you test and validate work that heavily uses {skills[3]} before shipping for this role?",
        f"Explain how you would scale or harden a feature that depends on {skills[4]} given this JD's constraints.",
    ]
    behavioral = [
        f"Tell me about a time you had to ramp up quickly on unfamiliar tech for a {seniority or 'mid-level'} role.",
        "Describe a disagreement with a teammate about technical approach and how you resolved it.",
        f"How do you prioritize work when multiple stakeholders need something from a {role_title}?",
        "Tell me about a time you owned a mistake in production or in a shared codebase. What did you do next?",
        f"Describe how you communicate progress and blockers when delivery pressure is high for a {role_title} role.",
    ]
    project = [
        f"Looking at {anchors[0]}, what would you reuse or change for this {role_title} role?",
        f"How does {anchors[1]} demonstrate skills this JD asks for?",
        f"Pick {anchors[2]} and explain the hardest technical decision you made and why.",
        f"In {anchors[3]}, what would you improve if you had two more weeks, and why does that matter for this JD?",
        f"Walk through the architecture of {anchors[4]} and map it to responsibilities listed in this job description.",
    ]

    out: list[dict[str, str]] = []
    for prompt in tech:
        out.append({"category": "TECHNICAL", "prompt": prompt})
    for prompt in behavioral:
        out.append({"category": "BEHAVIORAL", "prompt": prompt})
    for prompt in project:
        out.append({"category": "PROJECT", "prompt": prompt})
    return out


def _extract_resume_lines(resume_context: str | None, heading: str) -> list[str]:
    if not resume_context:
        return []
    lines = resume_context.splitlines()
    collecting = False
    found: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.lower().startswith(heading.lower()):
            collecting = True
            continue
        if collecting and re.match(r"^[A-Za-z][A-Za-z ]+:\s*$", stripped):
            break
        if collecting and stripped.startswith(("-", "•", "*")):
            text = stripped.lstrip("-•* ").strip()
            if text:
                found.append(text[:120])
        elif collecting and stripped:
            found.append(stripped[:120])
        if len(found) >= 5:
            break
    return found


def _jd_keywords(jd_text: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9+.#-]{2,}", jd_text or "")
    stop = {
        "the",
        "and",
        "for",
        "with",
        "you",
        "will",
        "our",
        "this",
        "that",
        "from",
        "have",
        "experience",
        "years",
        "team",
        "work",
        "role",
        "job",
        "ability",
        "strong",
        "using",
        "including",
    }
    out: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        key = t.lower()
        if key in stop or key in seen:
            continue
        seen.add(key)
        out.append(t)
        if len(out) >= 5:
            break
    return out


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def generate_answer_outline(
    *,
    question: str,
    category: str,
    role_title: str,
    jd_text: str,
    resume_context: str | None = None,
) -> str:
    """Coach outline + full sample answer. Uses resume when available."""
    has_resume = bool(resume_context and resume_context.strip())

    if is_llm_available():
        outline = _outline_with_llm(
            question=question,
            category=category,
            role_title=role_title,
            jd_text=jd_text,
            resume_context=resume_context,
            has_resume=has_resume,
        )
        if outline:
            return outline
        logger.warning("LLM outline unavailable; using template fallback")

    return _heuristic_outline(
        question=question,
        category=category,
        role_title=role_title,
        has_resume=has_resume,
        resume_context=resume_context,
    )


def _outline_with_llm(
    *,
    question: str,
    category: str,
    role_title: str,
    jd_text: str,
    resume_context: str | None,
    has_resume: bool,
) -> str | None:
    cat = category.upper()
    if cat == "BEHAVIORAL":
        structure = "STAR method (Situation, Task, Action, Result)"
        talking_hint = (
            "Talking points must include Situation, Task, Action (collaboration/"
            "troubleshooting steps), and Result (with a real metric from the resume "
            "when available)."
        )
    elif cat == "PROJECT":
        structure = "Context → Ownership → Decisions → Challenge → Outcome → JD fit"
        talking_hint = (
            "Talking points must cover project context, your ownership, key tech "
            "decisions, hardest problem, outcome, and how it maps to this JD."
        )
    else:
        structure = "Clarify → Approach → Design → Tradeoffs → Validate"
        talking_hint = (
            "Talking points must cover clarifying the problem, approach, design/"
            "steps, tradeoffs, and how you would test or validate."
        )

    resume_guidance = (
        "Use REAL project names, companies, tools, and metrics from the resume. "
        "Only use [placeholder] when the resume truly lacks that detail. "
        "The candidate should be able to practice without opening another AI."
        if has_resume
        else "No resume was provided — use clear [placeholders] the candidate can fill in."
    )

    resume_block = (
        f"""
CANDIDATE RESUME:
\"\"\"
{resume_context[:5500]}
\"\"\"
"""
        if has_resume
        else ""
    )

    prompt = f"""
You are an interview coach. Return ONE JSON object with BOTH fields filled.

{resume_guidance}

Return JSON exactly like:
{{
  "coachGuide": string,
  "sampleAnswer": string
}}

"coachGuide" must be plain text in this layout (no markdown headings):

Interview coach guide

- What the interviewer wants: <one clear sentence>
- Structure: {structure}
- Talking points:
  * <point 1 — concrete, resume-grounded when possible>
  * <point 2>
  * <point 3>
  * <point 4>
  * <point 5>
  * <point 6 if useful>
- Follow-up tip: <one practical tip for likely follow-ups>

"sampleAnswer" must be a full first-person spoken answer (~90–120 seconds).
Use "I …" voice. Include concrete resume/JD details.
Write the actual words the candidate can say — not bullets, not instructions.

Rules:
- {talking_hint}
- Both fields are required and must be non-empty
- Do not invent fake employers/projects; ground in resume when available

Category: {category}
Role: {role_title}
Question: {question}

JD CONTEXT:
\"\"\"
{jd_text[:4000]}
\"\"\"
{resume_block}
"""

    data = generate_json(prompt, max_output_tokens=4000)
    if not data:
        return None

    # Prefer split fields; fall back to legacy single-string shape
    guide = data.get("coachGuide")
    sample = data.get("sampleAnswer")
    legacy = data.get("answerOutline")

    if isinstance(guide, str) and guide.strip() and isinstance(sample, str) and sample.strip():
        guide_text = guide.strip()
        if not guide_text.lower().startswith("interview coach guide"):
            guide_text = f"Interview coach guide\n\n{guide_text}"
        return f"{guide_text}\n\nSample answer (say this)\n\n{sample.strip()}"

    if isinstance(legacy, str) and legacy.strip():
        text = legacy.strip()
        if "sample answer" in text.lower() and len(text) > 400:
            return text

    return None


def _heuristic_outline(
    *,
    question: str,
    category: str,
    role_title: str,
    has_resume: bool,
    resume_context: str | None = None,
) -> str:
    cat = category.upper()
    projects = _extract_resume_lines(resume_context, "Projects")
    experience = _extract_resume_lines(resume_context, "Experience")
    anchor = (projects or experience or ["a recent project relevant to this role"])[0]

    if cat == "BEHAVIORAL":
        structure = "STAR method (Situation, Task, Action, Result)"
        wants = (
            "A clear example of teamwork and ownership while resolving a technical "
            f"issue or delivering work for a {role_title} role"
        )
        talking = [
            f"Situation: Set the scene using {anchor} and the technical/process issue",
            "Task: State what you personally owned and the team's objective",
            "Action: Walk through collaboration, troubleshooting, and decisions you made",
            "Action: Call out one challenge and how you unblocked it",
            "Result: Share the outcome (use a real metric if you have one, else [metric])",
            "Result: Name the skills this proves (analysis, communication, ownership)",
        ]
        follow = (
            "Be ready with one deeper technical detail from that same example "
            "(tool, script, or decision) if they ask how you did it."
        )
        sample = (
            f"In {anchor}, our team hit a blocking technical issue close to a delivery date. "
            f"My task as someone targeting a {role_title} path was to diagnose the root cause "
            "and keep stakeholders unblocked. I paired with teammates to reproduce the failure, "
            "narrowed it with logs and a small scripted check, and proposed a fix plus a rollback plan. "
            "The harder part was aligning on the approach under time pressure — I documented options, "
            "we picked the safer path, and I owned the verification steps. We shipped the fix, reduced "
            "repeat incidents, and I learned to communicate status early. That same ownership and "
            f"debugging habit is how I’d show up in this {role_title} role."
        )
    elif cat == "PROJECT":
        structure = "Context → Ownership → Decisions → Challenge → Outcome → JD fit"
        wants = f"Depth on a real project and how it maps to this {role_title} job"
        talking = [
            f"Context: What {anchor} was and who it served",
            "Ownership: Your exact scope end-to-end",
            "Decisions: Key tech/architecture choices and why",
            "Challenge: Hardest problem and how you solved it",
            "Outcome: Result / learning (real metric if you have one)",
            f"JD fit: Two skills from this project that match the {role_title} JD",
        ]
        follow = (
            "Prepare one architecture detail and one ‘what you’d redo’ answer."
        )
        sample = (
            f"I’ll walk through {anchor}. I owned [scope: design/implementation/testing], "
            "and we needed to deliver a reliable feature under real constraints. I chose "
            "[tech] over [alternative] because of maintainability and fit with the existing stack. "
            "The hardest problem was [bottleneck/bug/integration]; I isolated it, shipped an "
            "incremental fix, and added checks so it wouldn’t regress. The result was a working "
            f"delivery and clearer ownership. For this {role_title} role, I’d reuse the same "
            "habit of scoping clearly, justifying tradeoffs, and validating before release."
        )
    else:
        structure = "Clarify → Approach → Design → Tradeoffs → Validate"
        wants = f"Structured technical thinking for a {role_title}, not buzzwords"
        talking = [
            "Clarify: Restate the goal and constraints before designing",
            "Approach: State your high-level plan in 2–3 steps",
            "Design: Walk through components / algorithm / data flow",
            "Tradeoffs: Name one alternative and why you rejected it",
            "Validate: Testing, monitoring, or rollout plan",
            f"Tie-back: How this shows readiness for the {role_title} JD",
        ]
        follow = (
            "Expect a dig into failure modes, scaling, or how you’d debug in production."
        )
        sample = (
            f"For this {role_title} question, I’d first clarify success criteria and constraints "
            f"— especially around {question[:120].rstrip('?')}. My approach would be to outline "
            "the data flow, pick the simplest design that meets the JD’s stack, then call out "
            "tradeoffs (latency vs complexity, consistency vs availability). I’d describe how I’d "
            "test it, what I’d monitor in production, and how I’d roll back. If useful, I’d map "
            f"this to {anchor} where I already practiced similar decisions."
        )

    if not has_resume:
        follow = (
            "Fill [placeholders] with your real project names and metrics before the interview. "
            + follow
        )

    lines = [
        "Interview coach guide",
        "",
        f"- What the interviewer wants: {wants}",
        f"- Structure: {structure}",
        "- Talking points:",
    ]
    for t in talking:
        lines.append(f"  * {t}")
    lines.extend(
        [
            f"- Follow-up tip: {follow}",
            "",
            "Sample answer (say this)",
            "",
            sample,
        ]
    )
    return "\n".join(lines)
