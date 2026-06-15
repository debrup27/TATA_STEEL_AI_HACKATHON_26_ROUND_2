"""Pydantic schemas for guardrail verdicts."""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class GuardrailAction(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    STEER = "steer"


class GuardrailCategory(str, Enum):
    NONE = "none"
    PROFANITY = "profanity"
    OFF_TOPIC = "off_topic"
    CODING = "coding"
    ESSAY = "essay"
    GENERAL = "general"


class GuardrailVerdict(BaseModel):
    action: GuardrailAction = GuardrailAction.ALLOW
    category: GuardrailCategory = GuardrailCategory.NONE
    reason: str = ""
    steered_text: str = ""
    original_text: str = ""


class ScopeClassifierResult(BaseModel):
    """Structured output from 0.8b borderline scope classifier."""

    action: Literal["allow", "block", "steer"] = "allow"
    category: Literal["none", "profanity", "off_topic", "coding", "essay", "general"] = "none"
    reason: str = Field(default="", max_length=200)
    steered_text: str = Field(default="", max_length=500)
