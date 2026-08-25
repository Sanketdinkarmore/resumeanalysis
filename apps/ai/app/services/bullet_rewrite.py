"""Rewrite resume experience bullets to better match a job description.

Tailors bullets toward a specific JD's required/preferred skills and keywords.
Never invents metrics — if impact is missing it flags the suggestion instead.
Prefers Groq → Gemini → deterministic heuristic fallback.
"""

from __future__ import annotations

import logging
import re

from app.services.llm_client import generate_json, is_llm_available

logger = logging.getLogger(__name__)

MAX_SUGGESTIONS = 8


def rewrite_bullets(
    *,
    role_title: str,
    required_skills: list[str],
    preferred_skills: list[str],
    keywords: list[str],
    experience: list[dict],
) -> list[dict]:
    """Return up to MAX_SUGGESTIONS JD-tailored bullet rewrites."""
    experience = [e for e in experience if e.get("bullets")]

    if is_llm_available():
        try:
            llm_suggestions = _rewrite_with_llm(
                role_title=role_title,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                keywords=keywords,
                experience=experience,
            )
            if llm_suggestions:
                return _dedupe(llm_suggestions)
            logger.warning("LLM bullet rewrite unavailable; using heuristic fallback")
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("LLM bullet rewrite error: %s; using heuristic fallback", exc)

    return _dedupe(
        _heuristic_rewrite(
            required_skills=required_skills,
            keywords=keywords,
            experience=experience,
        )
    )


def _rewrite_with_llm(
    *,
    role_title: str,
    required_skills: list[str],
    preferred_skills: list[str],
    keywords: list[str],
    experience: list[dict],
) -> list[dict] | None:
    import json

    exp_block = json.dumps(experience, ensure_ascii=False)[:7000]

    prompt = f"""
You are a resume writer helping a candidate tailor their experience bullets to a specific job description.
Rewrite each selected bullet so it surfaces the skills and keywords the JD asks for, using stronger, more
specific language. Do NOT invent metrics, employers, projects, or achievements not present in the original.

Return JSON exactly:
{{
  "suggestions": [
    {{ "experienceIndex": int, "bulletIndex": int, "original": string, "suggested": string, "impactMissing": bool, "focusSkill": string }}
  ]
}}

For each suggestion:
- "experienceIndex": index into the experience array (0-based)
- "bulletIndex": index into that entry's "bullets" array (0-based)
- "original": the EXACT original bullet text from the array
- "suggested": the rewritten bullet (stronger verb, JD-relevant keywords where they honestly apply)
- "impactMissing": true if the bullet has no measurable impact AND you cannot add a real one
- "focusSkill": the single JD skill/keyword this rewrite primarily surfaces

Rules:
- Suggest at most {MAX_SUGGESTIONS} bullets; prefer vague or weak bullets
- If the bullet lacks measurable impact, DO NOT invent a number — set "impactMissing": true and use a [impact] placeholder in "suggested" the user can fill in
- Only reference skills/keywords the candidate plausibly has (present in the bullet or in the resume)
- Keep each "suggested" to one line, 8-25 words
- Never change a bullet that is already strong and JD-relevant

ROLE: {role_title}
REQUIRED SKILLS: {", ".join(required_skills) or "N/A"}
PREFERRED SKILLS: {", ".join(preferred_skills) or "N/A"}
KEYWORDS: {", ".join(keywords) or "N/A"}

RESUME EXPERIENCE:
\"\"\"
{exp_block}
\"\"\"
"""

    data = generate_json(prompt, max_output_tokens=3000)
    if not data or not isinstance(data.get("suggestions"), list):
        return None

    cleaned: list[dict] = []
    for item in data["suggestions"]:
        if not isinstance(item, dict):
            continue
        suggestion = _coerce_suggestion(item, experience)
        if suggestion:
            cleaned.append(suggestion)
        if len(cleaned) >= MAX_SUGGESTIONS:
            break

    return cleaned or None


def _coerce_suggestion(item: dict, experience: list[dict]) -> dict | None:
    try:
        ei = int(item.get("experienceIndex"))
        bi = int(item.get("bulletIndex"))
    except (TypeError, ValueError):
        return None

    if ei < 0 or ei >= len(experience):
        return None
    bullets = experience[ei].get("bullets") or []
    if bi < 0 or bi >= len(bullets):
        return None

    original = str(bullets[bi]).strip()
    suggested = str(item.get("suggested") or "").strip()
    if not original or not suggested:
        return None

    return {
        "experienceIndex": ei,
        "bulletIndex": bi,
        "original": original,
        "suggested": suggested,
        "impactMissing": bool(item.get("impactMissing")),
        "focusSkill": str(item.get("focusSkill") or "").strip(),
    }


def _heuristic_rewrite(
    *,
    required_skills: list[str],
    keywords: list[str],
    experience: list[dict],
) -> list[dict]:
    """Deterministic rewrite so the feature works without an LLM."""
    targets = [s for s in required_skills if s and s.strip()]
    targets.extend([k for k in keywords if k and k.strip()])
    targets = _dedupe_keys(targets)

    suggestions: list[dict] = []
    for ei, entry in enumerate(experience):
        bullets = entry.get("bullets") or []
        for bi, bullet in enumerate(bullets):
            low = (bullet or "").lower()
            if not low:
                continue
            # Skip bullets that already mention a JD skill
            if any(t and t.lower() in low for t in targets):
                continue
            # Only touch short / vague bullets
            if len(low.split()) >= 8 and not re.search(r"\d", low):
                continue
            focus = targets[0] if targets else entry.get("title") or "the role"
            suggestions.append(
                {
                    "experienceIndex": ei,
                    "bulletIndex": bi,
                    "original": bullet,
                    "suggested": _simple_rewrite(bullet, focus),
                    "impactMissing": not bool(re.search(r"\d", bullet)),
                    "focusSkill": focus,
                }
            )
            if len(suggestions) >= MAX_SUGGESTIONS:
                return suggestions
    return suggestions[:MAX_SUGGESTIONS]


def _simple_rewrite(bullet: str, focus: str) -> str:
    text = (bullet or "").strip().rstrip(".")
    if not text:
        return bullet
    text = text[0].upper() + text[1:] if text[0].islower() else text
    return f"{text}, applying {focus} end to end."


def _dedupe(suggestions: list[dict]) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple] = set()
    for s in suggestions:
        key = (s["experienceIndex"], s["bulletIndex"])
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out[:MAX_SUGGESTIONS]


def _dedupe_keys(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for it in items:
        key = it.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out
