"""Groq OpenAI-compatible JSON generation (preferred free-tier provider)."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings
from app.services.json_utils import parse_json_object

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Prefer configured model, then other solid free-tier options
MODEL_CANDIDATES = (
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
)


def is_groq_available() -> bool:
    return bool(settings.groq_api_key) and OpenAI is not None


def generate_json(prompt: str, *, max_output_tokens: int = 4096) -> dict[str, Any] | None:
    """
    Call Groq chat completions with JSON object mode.
    Returns None on failure so callers can fall through to Gemini/templates.
    """
    if not is_groq_available():
        return None

    models = [settings.groq_model, *MODEL_CANDIDATES]
    seen: set[str] = set()
    ordered: list[str] = []
    for name in models:
        if name and name not in seen:
            seen.add(name)
            ordered.append(name)

    try:
        client = OpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)
    except Exception as exc:
        logger.warning("Groq client init failed: %s", exc)
        return None

    system = (
        "You are a helpful assistant that returns only valid JSON objects. "
        "No markdown fences, no commentary."
    )

    for model_name in ordered:
        try:
            response = client.chat.completions.create(
                model=model_name,
                temperature=0.2,
                max_tokens=max_output_tokens,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            )
            text = (response.choices[0].message.content or "").strip()
            if not text:
                logger.warning("Groq model %s returned empty content", model_name)
                continue
            parsed = parse_json_object(text)
            if parsed is not None:
                logger.info("Groq model %s succeeded", model_name)
                return parsed
            logger.warning("Groq model %s returned non-JSON", model_name)
        except Exception as exc:
            logger.warning("Groq model %s failed: %s", model_name, exc)
            continue

    logger.warning("All Groq model attempts failed")
    return None
