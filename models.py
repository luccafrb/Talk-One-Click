from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Segment = Literal["beleza", "saude", "ecommerce", "educacao"]
OnboardingStatus = Literal["ok", "partial", "error"]


class OnboardingRequest(BaseModel):
    business_name: str
    segment: Segment
    goal: str
    volume: str
    approach: str
    talk_api_key: str
    organization_id: str


class AiConfig(BaseModel):
    chatbot_name: str
    chatbot_approach: str
    explanation: str


class StepError(BaseModel):
    step: str
    error: str


class OnboardingResult(BaseModel):
    status: OnboardingStatus
    sectors_created: int = 0
    labels_created: int = 0
    chatbot_created: bool = False
    errors: list[StepError] = Field(default_factory=list)
