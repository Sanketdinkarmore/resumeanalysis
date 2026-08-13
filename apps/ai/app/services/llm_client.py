"""
Unified LLM JSON generation.

Order for interview (+ enrich):
  1. Groq (higher free RPM)
  2. Gemini
  3. Caller heuristic/templates
"""

from __future__ import annotations

import logging
from typing import Any

from app.services import gemini_client, groq_client

logger = logging.getLogger(__name__)


def is_llm_available() -> bool:
    return groq_client.is_groq_available() or gemini_client.is_gemini_available()


def generate_json(prompt: str, *, max_output_tokens: int = 4096) -> dict[str, Any] | None:
    if groq_client.is_groq_available():
        data = groq_client.generate_json(prompt, max_output_tokens=max_output_tokens)
        if data is not None:
            return data
        logger.info("Groq unavailable/failed; trying Gemini")

    if gemini_client.is_gemini_available():
        data = gemini_client.generate_json(prompt, max_output_tokens=max_output_tokens)
        if data is not None:
            return data
        logger.info("Gemini unavailable/failed")

    return None
